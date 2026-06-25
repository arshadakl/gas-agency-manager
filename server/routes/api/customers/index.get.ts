import { eq, like, and, sql, getTableColumns } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { customers, deliveries, customerPayments } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])

  const query = getQuery(event) as { search?: string }
  const db = useDB(event)

  const where = query.search
    ? and(eq(customers.isActive, 1), like(customers.name, `%${query.search}%`))
    : eq(customers.isActive, 1)

  const rows = await db
    .select({
      ...getTableColumns(customers),
      totalBilled: sql<number>`coalesce(sum(case when ${deliveries.status} = 'delivered' then ${deliveries.totalAmount} else 0 end), 0)`,
      totalPaid: sql<number>`coalesce((select sum(${customerPayments.amount}) from ${customerPayments} where ${customerPayments.customerId} = ${customers.id}), 0)`,
    })
    .from(customers)
    .leftJoin(deliveries, eq(deliveries.customerId, customers.id))
    .where(where)
    .groupBy(customers.id)
    .all()

  const data = rows.map((r) => ({ ...r, balance: Math.round((r.totalBilled - r.totalPaid) * 100) / 100 }))

  return { data, total: data.length }
})
