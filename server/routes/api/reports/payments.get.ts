import { and, gte, lte, sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { customerPayments } from '~/server/database/schema'
import { ReportQuerySchema } from '~/utils/validators'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])

  const { from, to } = parseQuery(event, ReportQuerySchema)
  const db = useDB(event)

  const rows = await db
    .select({
      paymentMode: customerPayments.paymentMode,
      totalAmount: sql<number>`coalesce(sum(${customerPayments.amount}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(customerPayments)
    .where(and(gte(customerPayments.paymentDate, from), lte(customerPayments.paymentDate, to)))
    .groupBy(customerPayments.paymentMode)
    .all()

  return { data: rows, total: rows.length }
})
