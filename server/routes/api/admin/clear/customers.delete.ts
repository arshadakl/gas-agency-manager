import { useDB } from '~/server/database'
import { customers, customerPayments, deliveries, deliveryItems, stockMovements, orders, orderItems } from '~/server/database/schema'

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

  return { data: { message: 'All customer data cleared' } }
})
