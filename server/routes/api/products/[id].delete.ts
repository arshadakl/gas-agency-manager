import { eq, sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { products, deliveryItems, orderItems, inventory } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery'])

  const publicId = getRouterParam(event, 'id')!
  const db = useDB(event)

  const product = await db.select().from(products).where(eq(products.publicId, publicId)).get()
  if (!product) throw createError({ statusCode: 404, message: 'Product not found' })

  // Check if this product appears in any history (deliveries, orders)
  const [deliveryRow, orderRow] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(deliveryItems)
      .where(eq(deliveryItems.productId, product.id)).get(),
    db.select({ count: sql<number>`count(*)` }).from(orderItems)
      .where(eq(orderItems.productId, product.id)).get(),
  ])

  const hasHistory = ((deliveryRow?.count ?? 0) + (orderRow?.count ?? 0)) > 0

  if (hasHistory) {
    // Soft delete — keep for referential integrity
    await db.update(products).set({ isActive: 0 }).where(eq(products.id, product.id))
    return { data: { softDeleted: true, message: 'Product hidden from active list. Delivery history preserved.' } }
  }

  // No history — hard delete. Clean up inventory row first.
  await db.delete(inventory).where(eq(inventory.productId, product.id))
  await db.delete(products).where(eq(products.id, product.id))

  return { data: { softDeleted: false, message: 'Product deleted.' } }
})
