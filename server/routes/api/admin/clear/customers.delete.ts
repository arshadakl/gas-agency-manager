import { useDB } from '~/server/database'
import { customers, customerPayments, deliveries, deliveryItems, stockMovements, cylinderStock, orders, orderItems } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])
  const db = useDB(event)

  // Delete in FK-safe dependency order
  await db.delete(stockMovements)
  await db.delete(deliveryItems)
  await db.delete(orderItems)
  await db.delete(customerPayments)
  await db.delete(deliveries)
  await db.delete(orders)
  await db.delete(customers)

  // Reset cylinder stock — movements are gone, stock must be zeroed
  await db.update(cylinderStock).set({ fullCount: 0, emptyCount: 0, ownCount: 0 })

  return { data: { message: 'All customer data cleared' } }
})
