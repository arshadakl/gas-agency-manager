import { useDB } from '~/server/database'
import { deliveries, purchases, customers, cylinderStock, stockMovements, accountTransactions, expenses, customerPayments, orders } from '~/server/database/schema'
import { sql, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])
  const db = useDB(event)

  const [deliveryCount, purchaseCount, customerCount, stockCount, transactionCount, expenseCount, paymentCount, pendingOrderCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(deliveries).get(),
    db.select({ count: sql<number>`count(*)` }).from(purchases).get(),
    db.select({ count: sql<number>`count(*)` }).from(customers).get(),
    db.select({ count: sql<number>`count(*)` }).from(stockMovements).get(),
    db.select({ count: sql<number>`count(*)` }).from(accountTransactions).get(),
    db.select({ count: sql<number>`count(*)` }).from(expenses).get(),
    db.select({ count: sql<number>`count(*)` }).from(customerPayments).get(),
    db.select({ count: sql<number>`count(*)` }).from(orders).where(eq(orders.status, 'pending')).get(),
  ])

  return {
    data: {
      deliveries: deliveryCount?.count ?? 0,
      purchases: purchaseCount?.count ?? 0,
      customers: customerCount?.count ?? 0,
      stock: stockCount?.count ?? 0,
      transactions: (transactionCount?.count ?? 0) + (expenseCount?.count ?? 0),
      payments: paymentCount?.count ?? 0,
      pendingOrders: pendingOrderCount?.count ?? 0,
    },
  }
})
