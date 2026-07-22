import { eq, sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { customers, deliveries, customerPayments, orders } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])

  const publicId = getRouterParam(event, 'id')!
  const db = useDB(event)

  const existing = await db.select().from(customers).where(eq(customers.publicId, publicId)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Customer not found' })

  // Check if customer has any live relations
  const [deliveryCount, paymentCount, orderCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(deliveries).where(eq(deliveries.customerId, existing.id)).get(),
    db.select({ count: sql<number>`count(*)` }).from(customerPayments).where(eq(customerPayments.customerId, existing.id)).get(),
    db.select({ count: sql<number>`count(*)` }).from(orders).where(eq(orders.customerId, existing.id)).get(),
  ])

  const hasRelations = (deliveryCount?.count ?? 0) + (paymentCount?.count ?? 0) + (orderCount?.count ?? 0) > 0

  if (hasRelations) {
    // Soft delete — preserve historical data
    const [updated] = await db.update(customers)
      .set({ isActive: 0 })
      .where(eq(customers.id, existing.id))
      .returning()
    if (!updated) throw createError({ statusCode: 500, message: 'Failed to archive customer' })
    return { data: updated, action: 'soft_delete' as const }
  }

  // Hard delete — no relations, safe to remove completely
  await db.delete(customers).where(eq(customers.id, existing.id))
  return { data: null, action: 'hard_delete' as const }
})
