import { and, eq, gte, lte, desc, sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { customers, deliveries } from '~/server/database/schema'
import { ReportQuerySchema } from '~/utils/validators'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'viewer'])

  const { from, to } = parseQuery(event, ReportQuerySchema)
  const db = useDB(event)

  const rows = await db
    .select({
      customerId: customers.id,
      name: customers.name,
      totalBilled: sql<number>`coalesce(sum(${deliveries.totalAmount}), 0)`,
      deliveryCount: sql<number>`count(${deliveries.id})`,
    })
    .from(customers)
    .innerJoin(deliveries, and(
      eq(deliveries.customerId, customers.id),
      eq(deliveries.status, 'delivered'),
      gte(deliveries.deliveryDate, from),
      lte(deliveries.deliveryDate, to),
    ))
    .groupBy(customers.id)
    .orderBy(desc(sql`coalesce(sum(${deliveries.totalAmount}), 0)`))
    .limit(20)
    .all()

  return { data: rows, total: rows.length }
})
