import { eq, inArray, sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { deliveries, deliveryItems, inventory, products, customers } from '~/server/database/schema'
import { DeliverySchema } from '~/utils/validators'
import { validateStockChanges, commitStockChanges } from '~/server/utils/stock'
import { recordDeliveryPayment } from '~/server/utils/payment'
import type { CylinderSize } from '~/types'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery'])

  const body = await parseBody(event, DeliverySchema)
  const db = useDB(event)

  const customer = await db.select({ id: customers.id }).from(customers).where(eq(customers.id, body.customerId)).get()
  if (!customer) throw createError({ statusCode: 404, message: 'Customer not found' })

  const productRows = await db.select().from(products)
    .where(inArray(products.id, body.items.map((i) => i.productId)))
    .all()
  const productById = new Map(productRows.map((p) => [p.id, p]))

  const cylinderTotals = new Map<CylinderSize, number>()
  for (const item of body.items) {
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

  // Validate before any write — D1 has no rollback, so a failure here must
  // never leave an orphaned delivery record (see CLAUDE.md §23.4 D1 note).
  if (cylinderChanges.length > 0) await validateStockChanges(db, cylinderChanges)

  const [delivery] = await db.insert(deliveries).values({
    customerId: body.customerId,
    deliveryDate: body.deliveryDate,
    status: 'delivered',
    paymentStatus: body.paymentStatus,
    totalAmount: body.totalAmount,
    notes: body.notes,
    createdBy: user.id,
    createdByName: user.fullName,
  }).returning()

  if (!delivery) throw createError({ statusCode: 500, message: 'Failed to create delivery' })

  const accessoryItems = body.items.filter((i) => productById.get(i.productId)?.type !== 'cylinder')

  const batchQueries = [
    ...body.items.map((item) =>
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

  if (body.paymentStatus === 'paid' && body.paymentMode) {
    await recordDeliveryPayment(db, {
      customerId: body.customerId,
      deliveryId: delivery.id,
      amount: body.totalAmount,
      paymentDate: body.deliveryDate,
      paymentMode: body.paymentMode,
      user,
    })
  }

  return { data: { ...delivery, items: body.items } }
})
