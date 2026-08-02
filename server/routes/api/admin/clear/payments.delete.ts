import { useDB } from '~/server/database'
import { customerPayments, accountTransactions, accounts } from '~/server/database/schema'
import { sql, eq, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])
  const db = useDB(event)

  // Delete all customer payments
  await db.delete(customerPayments)

  // Delete payment-related account transactions (payment_received + delivery_collection)
  await db.delete(accountTransactions).where(
    inArray(accountTransactions.transactionType, ['payment_received', 'delivery_collection']),
  )

  // Recalculate account balances from remaining transactions
  const txSums = await db.select({
    accountType: accountTransactions.accountType,
    total: sql<number>`coalesce(sum(${accountTransactions.amount}), 0)`,
  }).from(accountTransactions).groupBy(accountTransactions.accountType).all()

  // Reset all accounts to zero first, then apply remaining transaction sums
  await db.update(accounts).set({ balance: 0, updatedAt: sql`(datetime('now'))` })
  for (const row of txSums) {
    await db.update(accounts)
      .set({ balance: row.total, updatedAt: sql`(datetime('now'))` })
      .where(eq(accounts.type, row.accountType))
  }

  return { data: { message: 'All collected payments cleared, account balances recalculated' } }
})
