import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { deliveries, deliveryItems, stockMovements, orders } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin'])
  const db = useDB(event)

  await db.delete(stockMovements).where(eq(stockMovements.referenceType, 'delivery'))
  await db.delete(deliveryItems)
  await db.delete(deliveries)
  // Reset orders that were converted to deliveries back to pending
  await db.update(orders).set({ status: 'pending', deliveryId: null, deliveredAt: null })

  return { data: { message: 'All delivery data cleared' } }
})
