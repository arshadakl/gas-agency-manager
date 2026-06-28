import { eq, isNotNull } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { deliveries, deliveryItems, customerPayments, stockMovements, orders } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])
  const db = useDB(event)

  // Null FK refs before deleting deliveries — D1 may enforce FK constraints
  await db.update(orders)
    .set({ status: 'pending', deliveryId: null, deliveredAt: null })
  await db.update(customerPayments)
    .set({ deliveryId: null })
    .where(isNotNull(customerPayments.deliveryId))

  await db.delete(stockMovements).where(eq(stockMovements.referenceType, 'delivery'))
  await db.delete(deliveryItems)
  await db.delete(deliveries)

  return { data: { message: 'All delivery data cleared' } }
})
