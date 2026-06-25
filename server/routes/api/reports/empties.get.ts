import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { stockMovements } from '~/server/database/schema'
import { ReportQuerySchema } from '~/utils/validators'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'viewer'])

  const { from, to } = parseQuery(event, ReportQuerySchema)
  const db = useDB(event)

  const rows = await db
    .select({
      sizeKg: stockMovements.sizeKg,
      totalCollected: sql<number>`coalesce(sum(${stockMovements.emptyChange}), 0)`,
    })
    .from(stockMovements)
    .where(and(
      eq(stockMovements.movementType, 'delivery'),
      gte(sql`date(${stockMovements.createdAt})`, from),
      lte(sql`date(${stockMovements.createdAt})`, to),
    ))
    .groupBy(stockMovements.sizeKg)
    .all()

  return { data: rows, total: rows.length }
})
