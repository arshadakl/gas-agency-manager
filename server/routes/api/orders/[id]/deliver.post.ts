import { z } from 'zod'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { orders, orderItems, deliveries, deliveryItems, inventory, products } from '~/server/database/schema'
import { validateStockChanges, commitStockChanges } from '~/server/utils/stock'
import { recordCustomerPayment } from '~/server/utils/payment'
import { PAYMENT_MODES } from '~/types'
import type { CylinderSize } from '~/types'

const DeliverOrderSchema = z.object({
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalAmount: z.number().positive(),
  amountCollected: z.number().min(0).default(0),
  paymentMode: z.enum(PAYMENT_MODES).optional(),
}).refine((data) => data.amountCollected === 0 || !!data.paymentMode, {
  message: 'paymentMode is required when collecting an amount',
  path: ['paymentMode'],
})

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery'])

  const id = Number(getRouterParam(event, 'id'))
  const body = await parseBody(event, DeliverOrderSchema)
  const db = useDB(event)

  const order = await db.select().from(orders).where(eq(orders.id, id)).get()
  if (!order) throw createError({ statusCode: 404, message: 'Order not found' })

  // Conditional UPDATE = D1-safe optimistic lock (no transactions/row locks).
  // Only one concurrent request will see 1 row updated; the other bails here.
  const [claimed] = await db.update(orders)
    .set({ status: 'delivered', deliveredAt: new Date().toISOString() })
    .where(and(eq(orders.id, id), eq(orders.status, 'pending')))
    .returning()

  if (!claimed) throw createError({ statusCode: 409, message: `Order already ${order.status}` })

  try {
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id)).all()
    if (items.length === 0) throw createError({ statusCode: 422, message: 'Order has no items' })

    const productRows = await db.select().from(products)
      .where(inArray(products.id, items.map((i) => i.productId)))
      .all()
    const productById = new Map(productRows.map((p) => [p.id, p]))

    const cylinderTotals = new Map<CylinderSize, number>()
    for (const item of items) {
      const product = productById.get(item.productId)
      if (product?.type !== 'cylinder' || !product.cylinderSize) continue
      const size = product.cylinderSize as CylinderSize
      cylinderTotals.set(size, (cylinderTotals.get(size) ?? 0) + item.quantity)
    }
    const cylinderChanges = Array.from(cylinderTotals.entries()).map(([sizeKg, qty]) => ({
      sizeKg,
      fullChange: -qty,
      emptyChange: qty,
    }))

    if (cylinderChanges.length > 0) await validateStockChanges(db, cylinderChanges)

    const [delivery] = await db.insert(deliveries).values({
      customerId: order.customerId,
      deliveryDate: body.deliveryDate,
      status: 'delivered',
      paymentStatus: 'pending',
      totalAmount: body.totalAmount,
      notes: order.notes,
      createdBy: user.id,
      createdByName: user.fullName,
    }).returning()

    if (!delivery) throw createError({ statusCode: 500, message: 'Failed to create delivery' })

    const accessoryItems = items.filter((i) => productById.get(i.productId)?.type !== 'cylinder')

    const batchQueries = [
      ...items.map((item) =>
        db.insert(deliveryItems).values({
          deliveryId: delivery.id,
          productId: item.productId,
          quantity: item.quantity,
        })
      ),
      ...accessoryItems.map((item) =>
        db.insert(inventory)
          .values({ productId: item.productId, quantity: -item.quantity })
          .onConflictDoUpdate({
            target: inventory.productId,
            set: { quantity: sql`${inventory.quantity} - ${item.quantity}` },
          })
      ),
    ]
    await db.batch(batchQueries as [typeof batchQueries[number], ...typeof batchQueries])

    if (cylinderChanges.length > 0) {
      await commitStockChanges(db, cylinderChanges, 'delivery', delivery.id, 'delivery', user)
    }

    let finalDelivery = delivery
    if (body.amountCollected > 0 && body.paymentMode) {
      await recordCustomerPayment(db, {
        customerId: order.customerId,
        deliveryId: delivery.id,
        amount: body.amountCollected,
        paymentDate: body.deliveryDate,
        paymentMode: body.paymentMode,
        notes: 'Collected at delivery',
        target: { type: 'fifo' },
        user,
      })
      // FIFO may have updated this delivery (or only older ones) — refetch for accuracy.
      finalDelivery = await db.select().from(deliveries).where(eq(deliveries.id, delivery.id)).get() ?? delivery
    }

    const [updatedOrder] = await db.update(orders)
      .set({ deliveryId: delivery.id })
      .where(eq(orders.id, id))
      .returning()
    if (!updatedOrder) throw createError({ statusCode: 500, message: 'Failed to link order to delivery' })

    return { data: { order: updatedOrder, delivery: finalDelivery } }
  } catch (err) {
    // Best-effort claim release — D1 has no rollback (CLAUDE.md §23.4).
    await db.update(orders)
      .set({ status: 'pending', deliveredAt: null })
      .where(eq(orders.id, id))
    throw err
  }
})
