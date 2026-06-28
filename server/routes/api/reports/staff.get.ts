import { and, eq, gte, lte, desc, sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { deliveries } from '~/server/database/schema'
import { ReportQuerySchema } from '~/utils/validators'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])

  const { from, to } = parseQuery(event, ReportQuerySchema)
  const db = useDB(event)

  const rows = await db
    .select({
      createdBy: deliveries.createdBy,
      createdByName: deliveries.createdByName,
      deliveryCount: sql<number>`count(*)`,
      totalValue: sql<number>`coalesce(sum(${deliveries.totalAmount}), 0)`,
    })
    .from(deliveries)
    .where(and(
      eq(deliveries.status, 'delivered'),
      gte(deliveries.deliveryDate, from),
      lte(deliveries.deliveryDate, to),
    ))
    .groupBy(deliveries.createdBy)
    .orderBy(desc(sql`count(*)`))
    .all()

  return { data: rows, total: rows.length }
})
