import { eq, like, or, and, sql, getTableColumns } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { customers, deliveries, customerPayments } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])

  const query = getQuery(event) as { search?: string; isActive?: string }
  const db = useDB(event)

  const isActiveFilter = query.isActive === '0' ? 0 : 1

  const conditions = [eq(customers.isActive, isActiveFilter)]

  if (query.search) {
    const searchCondition = or(like(customers.name, `%${query.search}%`), like(customers.phone, `%${query.search}%`))
    if (searchCondition) conditions.push(searchCondition)
  }

  const where = conditions.length > 1 ? and(...conditions) : conditions[0]!

  const rows = await db
    .select({
      ...getTableColumns(customers),
      totalBilled: sql<number>`coalesce(sum(case when ${deliveries.status} = 'delivered' then ${deliveries.totalAmount} else 0 end), 0)`,
      totalPaid: sql<number>`coalesce((select sum(${customerPayments.amount}) from ${customerPayments} where ${customerPayments.customerId} = ${customers.id}), 0)`,
      pendingDeliveryCount: sql<number>`coalesce(sum(case when ${deliveries.status} = 'delivered' and ${deliveries.paymentStatus} != 'paid' then 1 else 0 end), 0)`,
    })
    .from(customers)
    .leftJoin(deliveries, eq(deliveries.customerId, customers.id))
    .where(where)
    .groupBy(customers.id)
    .all()

  const data = rows.map((r) => ({ ...r, balance: Math.round(((r.openingBalance ?? 0) + r.totalBilled - r.totalPaid) * 100) / 100 }))

  return { data, total: data.length }
})
