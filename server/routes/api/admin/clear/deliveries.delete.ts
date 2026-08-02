import { eq, isNotNull } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { deliveries, deliveryItems, customerPayments, stockMovements, cylinderStock, orders } from '~/server/database/schema'

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

  // Reset cylinder stock — movements are gone, stock must be zeroed
  await db.update(cylinderStock).set({ fullCount: 0, emptyCount: 0, ownCount: 0 })

  return { data: { message: 'All delivery data cleared' } }
})
