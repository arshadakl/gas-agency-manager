import { useDB } from '~/server/database'
import { accountTransactions, expenses, accounts } from '~/server/database/schema'
import { sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])
  const db = useDB(event)

  await db.delete(accountTransactions)
  await db.delete(expenses)

  // Reset account balances to zero
  await db.update(accounts).set({ balance: 0, updatedAt: sql`(datetime('now'))` })

  return { data: { message: 'All transactions and expenses cleared, balances reset to zero' } }
})
