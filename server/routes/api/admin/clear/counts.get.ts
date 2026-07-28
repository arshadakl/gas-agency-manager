import { useDB } from '~/server/database'
import { deliveries, purchases, customers, cylinderStock, stockMovements, accountTransactions, expenses } from '~/server/database/schema'
import { sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])
  const db = useDB(event)

  const [deliveryCount, purchaseCount, customerCount, stockCount, transactionCount, expenseCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(deliveries).get(),
    db.select({ count: sql<number>`count(*)` }).from(purchases).get(),
    db.select({ count: sql<number>`count(*)` }).from(customers).get(),
    db.select({ count: sql<number>`count(*)` }).from(stockMovements).get(),
    db.select({ count: sql<number>`count(*)` }).from(accountTransactions).get(),
    db.select({ count: sql<number>`count(*)` }).from(expenses).get(),
  ])

  return {
    data: {
      deliveries: deliveryCount?.count ?? 0,
      purchases: purchaseCount?.count ?? 0,
      customers: customerCount?.count ?? 0,
      stock: stockCount?.count ?? 0,
      transactions: (transactionCount?.count ?? 0) + (expenseCount?.count ?? 0),
    },
  }
})
