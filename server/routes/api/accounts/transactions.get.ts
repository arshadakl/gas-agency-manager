import { desc, eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { accountTransactions } from '~/server/database/schema'
import type { AccountType } from '~/types'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])

  const query = getQuery(event) as { accountType?: string; limit?: string }
  const db = useDB(event)
  const limit = query.limit ? parseInt(query.limit) : 50

  const whereClause = query.accountType
    ? eq(accountTransactions.accountType, query.accountType as AccountType)
    : undefined

  const rows = await db.select()
    .from(accountTransactions)
    .where(whereClause)
    .orderBy(desc(accountTransactions.createdAt))
    .limit(limit)
    .all()

  return { data: rows }
})
