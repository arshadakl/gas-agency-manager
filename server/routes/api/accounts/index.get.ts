import { useDB } from '~/server/database'
import { accounts } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])

  const db = useDB(event)
  const rows = await db.select().from(accounts).all()

  const balances: Record<string, number> = {}
  for (const row of rows) {
    balances[row.type] = row.balance
  }

  const totalBalance = Math.round(((balances.cash ?? 0) + (balances.bank ?? 0)) * 100) / 100

  return {
    data: {
      cash: balances.cash ?? 0,
      bank: balances.bank ?? 0,
      total: totalBalance,
    },
  }
})
