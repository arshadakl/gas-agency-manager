import { desc } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { stockMovements } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])

  const query = getQuery(event) as { limit?: string }
  const limit = query.limit ? Math.min(Number(query.limit), 200) : 50
  const db = useDB(event)

  const rows = await db.select().from(stockMovements)
    .orderBy(desc(stockMovements.createdAt))
    .limit(limit)
    .all()

  return { data: rows, total: rows.length }
})
