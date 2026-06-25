import { z } from 'zod'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { orders, orderItems, deliveries, deliveryItems, inventory, products } from '~/server/database/schema'
import { validateStockChanges, commitStockChanges } from '~/server/utils/stock'
import { recordDeliveryPayment } from '~/server/utils/payment'
import { DELIVERY_PAYMENT_STATUSES, PAYMENT_MODES } from '~/types'
import type { CylinderSize } from '~/types'

const DeliverOrderSchema = z.object({
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentStatus: z.enum(DELIVERY_PAYMENT_STATUSES).default('pending'),
  paymentMode: z.enum(PAYMENT_MODES).optional(),
}).refine((data) => data.paymentStatus !== 'paid' || !!data.paymentMode, {
  message: 'paymentMode is required when paymentStatus is paid',
  path: ['paymentMode'],
})

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery'])

  const id = Number(getRouterParam(event, 'id'))
  const body = await parseBody(event, DeliverOrderSchema)
  const db = useDB(event)

  const order = await db.select().from(orders).where(eq(orders.id, id)).get()
  if (!order) throw createError({ statusCode: 404, message: 'Order not found' })

  // Atomically claim the order before doing any other work — a conditional
  // UPDATE is the only way to avoid a double-deliver race on D1 (no
  // transactions/row locks, see CLAUDE.md §23.4). If two requests for the
  // same order land close together (double-tap, two tabs), only one will
  // affect a row here; the other gets 0 rows back and bails immediately,
  // before touching stock or money.
  const [claimed] = await db.update(orders)
    .set({ status: 'delivered', deliveredAt: new Date().toISOString() })
    .where(and(eq(orders.id, id), eq(orders.status, 'pending')))
    .returning()

  if (!claimed) throw createError({ statusCode: 409, message: `Order already ${order.status}` })

  try {
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id)).all()
    if (items.length === 0) throw createError({ statusCode: 422, message: 'Order has no items' })

    const itemsWithPrice = await Promise.all(items.map(async (item) => {
      const unitPrice = await resolvePrice(event, item.productId, order.customerId, body.deliveryDate)
      const subtotal = Math.round(item.quantity * unitPrice * 100) / 100
      return { productId: item.productId, quantity: item.quantity, unitPrice, subtotal }
    }))

    const totalAmount = Math.round(itemsWithPrice.reduce((sum, i) => sum + i.subtotal, 0) * 100) / 100

    const productRows = await db.select().from(products)
      .where(inArray(products.id, itemsWithPrice.map((i) => i.productId)))
      .all()
    const productById = new Map(productRows.map((p) => [p.id, p]))

    const cylinderTotals = new Map<CylinderSize, number>()
    for (const item of itemsWithPrice) {
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
      paymentStatus: body.paymentStatus,
      totalAmount,
      notes: order.notes,
      createdBy: user.id,
      createdByName: user.fullName,
    }).returning()

    if (!delivery) throw createError({ statusCode: 500, message: 'Failed to create delivery' })

    const accessoryItems = itemsWithPrice.filter((i) => productById.get(i.productId)?.type !== 'cylinder')

    const batchQueries = [
      ...itemsWithPrice.map((item) =>
        db.insert(deliveryItems).values({
          deliveryId: delivery.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
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

    if (body.paymentStatus === 'paid' && body.paymentMode) {
      await recordDeliveryPayment(db, {
        customerId: order.customerId,
        deliveryId: delivery.id,
        amount: totalAmount,
        paymentDate: body.deliveryDate,
        paymentMode: body.paymentMode,
        user,
      })
    }

    const [updatedOrder] = await db.update(orders)
      .set({ deliveryId: delivery.id })
      .where(eq(orders.id, id))
      .returning()

    return { data: { order: updatedOrder, delivery } }
  } catch (err) {
    // We already claimed the order (flipped it to 'delivered') before this
    // failed — release the claim so it's not stuck "delivered" with no
    // actual delivery behind it. Best-effort only; D1 has no rollback.
    await db.update(orders)
      .set({ status: 'pending', deliveredAt: null })
      .where(eq(orders.id, id))
    throw err
  }
})
