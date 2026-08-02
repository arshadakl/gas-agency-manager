import { useDB } from '~/server/database'
import { orders, orderItems } from '~/server/database/schema'
import { eq, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])
  const db = useDB(event)

  // Get pending order IDs
  const pendingOrders = await db.select({ id: orders.id }).from(orders).where(eq(orders.status, 'pending')).all()
  const pendingIds = pendingOrders.map((o) => o.id)

  if (pendingIds.length > 0) {
    // Delete order items for pending orders (FK dependency)
    await db.delete(orderItems).where(inArray(orderItems.orderId, pendingIds))
    // Delete the pending orders themselves
    await db.delete(orders).where(eq(orders.status, 'pending'))
  }

  return { data: { message: `All pending orders cleared (${pendingIds.length} orders)` } }
})
