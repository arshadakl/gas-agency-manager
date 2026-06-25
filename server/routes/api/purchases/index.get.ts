import { and, desc, gte, lte } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { purchases } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'viewer'])

  const query = getQuery(event) as { from?: string; to?: string }
  const db = useDB(event)

  const conditions = [
    query.from ? gte(purchases.purchaseDate, query.from) : undefined,
    query.to ? lte(purchases.purchaseDate, query.to) : undefined,
  ].filter((c) => c !== undefined)

  const rows = await db.select().from(purchases)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(purchases.purchaseDate))
    .all()

  return { data: rows, total: rows.length }
})
