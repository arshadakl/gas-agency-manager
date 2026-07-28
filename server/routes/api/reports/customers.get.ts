import { and, eq, gte, lte, desc, sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { customers, deliveries } from '~/server/database/schema'
import { ReportQuerySchema } from '~/utils/validators'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])

  const query = getQuery(event) as { from: string; to: string; type?: string }
  const { from, to } = parseQuery(event, ReportQuerySchema)
  const db = useDB(event)

  const conditions = [
    eq(deliveries.status, 'delivered'),
    gte(deliveries.deliveryDate, from),
    lte(deliveries.deliveryDate, to),
  ]

  if (query.type && (query.type === 'restaurant' || query.type === 'home')) {
    conditions.push(eq(customers.type, query.type))
  }

  const rows = await db
    .select({
      customerId: customers.id,
      customerPublicId: customers.publicId,
      name: customers.name,
      type: customers.type,
      totalBilled: sql<number>`coalesce(sum(${deliveries.totalAmount}), 0)`,
      deliveryCount: sql<number>`count(${deliveries.id})`,
    })
    .from(customers)
    .innerJoin(deliveries, and(...conditions))
    .groupBy(customers.id)
    .orderBy(desc(sql`coalesce(sum(${deliveries.totalAmount}), 0)`))
    .limit(20)
    .all()

  return { data: rows, total: rows.length }
})
