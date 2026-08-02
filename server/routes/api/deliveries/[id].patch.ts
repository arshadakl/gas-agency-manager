import { eq, inArray, sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { deliveries, deliveryItems, inventory, products } from '~/server/database/schema'
import { DeliverySchema } from '~/utils/validators'
import { deriveStatus } from '~/server/utils/payment'
import { validateStockChanges, commitStockChanges } from '~/server/utils/stock'
import type { CylinderSize } from '~/types'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery'])
  const publicId = getRouterParam(event, 'id')!

  const body = await parseBody(event, DeliverySchema)
  const db = useDB(event)

  const originalDelivery = await db.select()
    .from(deliveries)
    .where(eq(deliveries.publicId, publicId))
    .get()

  if (!originalDelivery) throw createError({ statusCode: 404, message: 'Delivery not found' })

  // Block customerId changes — orphaning FIFO payment allocations
  if (body.customerId !== originalDelivery.customerId) {
    throw createError({ statusCode: 422, message: 'Cannot change customer on an existing delivery' })
  }

  // Fetch original items to compute stock net changes
  const originalItems = await db.select()
    .from(deliveryItems)
    .where(eq(deliveryItems.deliveryId, originalDelivery.id))
    .all()

  const allProductIds = [...new Set([
    ...originalItems.map((i) => i.productId),
    ...body.items.map((i) => i.productId),
  ])]
  const productRows = allProductIds.length > 0
    ? await db.select().from(products).where(inArray(products.id, allProductIds)).all()
    : []
  const productById = new Map(productRows.map((p) => [p.id, p]))

  // Compute net stock changes (old reversal + new application)
  function computeCylinderChanges(items: Array<{ productId: number; quantity: number }>) {
    const totals = new Map<CylinderSize, number>()
    for (const item of items) {
      const product = productById.get(item.productId)
      if (product?.type !== 'cylinder' || !product.cylinderSize) continue
      const size = product.cylinderSize as CylinderSize
      totals.set(size, (totals.get(size) ?? 0) + item.quantity)
    }
    return totals
  }

  const oldCylinderTotals = computeCylinderChanges(originalItems)
  const newCylinderTotals = computeCylinderChanges(body.items)
  const allSizes = new Set([...oldCylinderTotals.keys(), ...newCylinderTotals.keys()])

  const cylinderChanges = Array.from(allSizes).map((sizeKg) => ({
    sizeKg,
    fullChange: -((newCylinderTotals.get(sizeKg) ?? 0) - (oldCylinderTotals.get(sizeKg) ?? 0)),
    emptyChange: (newCylinderTotals.get(sizeKg) ?? 0) - (oldCylinderTotals.get(sizeKg) ?? 0),
  })).filter((c) => c.fullChange !== 0 || c.emptyChange !== 0)

  if (cylinderChanges.length > 0) await validateStockChanges(db, cylinderChanges)

  // Compute net accessory inventory changes
  const oldAccessories = originalItems
    .filter((i) => productById.get(i.productId)?.type !== 'cylinder')
    .map((i) => ({ productId: i.productId, quantity: i.quantity }))
  const newAccessories = body.items
    .filter((i) => productById.get(i.productId)?.type !== 'cylinder')
    .map((i) => ({ productId: i.productId, quantity: i.quantity }))

  // Update delivery record — never touches money already collected
  await db.update(deliveries)
    .set({
      customerId: body.customerId,
      deliveryDate: body.deliveryDate,
      paymentStatus: deriveStatus(originalDelivery.amountCollected, body.totalAmount),
      totalAmount: body.totalAmount,
      notes: body.notes,
    })
    .where(eq(deliveries.id, originalDelivery.id))

  // Replace delivery items — validate product IDs first, then swap
  const newProductIds = body.items.map((i) => i.productId)
  if (newProductIds.length > 0) {
    const validCount = await db.select({ count: sql<number>`count(*)` })
      .from(products)
      .where(inArray(products.id, newProductIds))
      .get()
    if ((validCount?.count ?? 0) !== newProductIds.length) {
      throw createError({ statusCode: 422, message: 'One or more products not found' })
    }
  }

  await db.delete(deliveryItems)
    .where(eq(deliveryItems.deliveryId, originalDelivery.id))

  if (body.items.length > 0) {
    await db.insert(deliveryItems).values(
      body.items.map((item) => ({
        deliveryId: originalDelivery.id,
        productId: item.productId,
        quantity: item.quantity,
      }))
    )
  }

  // Apply accessory inventory adjustments via batch
  const inventoryQueries = [
    ...oldAccessories.map((item) =>
      db.insert(inventory)
        .values({ productId: item.productId, quantity: item.quantity })
        .onConflictDoUpdate({
          target: inventory.productId,
          set: { quantity: sql`${inventory.quantity} + ${item.quantity}` },
        })
    ),
    ...newAccessories.map((item) =>
      db.insert(inventory)
        .values({ productId: item.productId, quantity: -item.quantity })
        .onConflictDoUpdate({
          target: inventory.productId,
          set: { quantity: sql`${inventory.quantity} - ${item.quantity}` },
        })
    ),
  ]
  if (inventoryQueries.length > 0) {
    await db.batch(inventoryQueries as [typeof inventoryQueries[number], ...typeof inventoryQueries])
  }

  // Apply cylinder stock net changes
  if (cylinderChanges.length > 0) {
    await commitStockChanges(db, cylinderChanges, 'delivery', originalDelivery.id, 'delivery', user, 'delivery edit adjustment')
  }

  return {
    data: {
      ...originalDelivery,
      totalAmount: body.totalAmount,
      paymentStatus: deriveStatus(originalDelivery.amountCollected, body.totalAmount),
      items: body.items,
    },
  }
})
