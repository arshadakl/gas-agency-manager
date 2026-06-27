import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import {
  customers, customerPayments, deliveries, deliveryItems,
  stockMovements, orders, orderItems, prices,
} from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin'])
  const db = useDB(event)

  // Delete in dependency order
  await db.delete(stockMovements).where(eq(stockMovements.referenceType, 'delivery'))
  await db.delete(deliveryItems)
  await db.delete(customerPayments)
  await db.delete(deliveries)
  await db.delete(orderItems)
  await db.delete(orders)
  await db.delete(prices)
  await db.delete(customers)

  return { data: { message: 'All customer data cleared' } }
})
