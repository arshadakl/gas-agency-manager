import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { deliveries, customerPayments } from '~/server/database/schema'
import { ReportQuerySchema } from '~/utils/validators'

async function fetchSummary(db: ReturnType<typeof useDB>, from: string, to: string) {
  const [billed, collected] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(${deliveries.totalAmount}), 0)` })
      .from(deliveries)
      .where(and(eq(deliveries.status, 'delivered'), gte(deliveries.deliveryDate, from), lte(deliveries.deliveryDate, to)))
      .get(),
    db.select({ total: sql<number>`coalesce(sum(${customerPayments.amount}), 0)` })
      .from(customerPayments)
      .where(and(gte(customerPayments.paymentDate, from), lte(customerPayments.paymentDate, to)))
      .get(),
  ])
  return { billed: billed?.total ?? 0, collected: collected?.total ?? 0 }
}

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'viewer'])

  const { from, to } = parseQuery(event, ReportQuerySchema)
  const db = useDB(event)

  const prevRange = getPreviousPeriod(from, to)
  const [current, previous] = await Promise.all([
    fetchSummary(db, from, to),
    fetchSummary(db, prevRange.from, prevRange.to),
  ])

  return {
    data: {
      billed: current.billed,
      collected: current.collected,
      outstanding: Math.round((current.billed - current.collected) * 100) / 100,
      previousBilled: previous.billed,
      previousCollected: previous.collected,
      billedDelta: getDelta(current.billed, previous.billed),
      collectedDelta: getDelta(current.collected, previous.collected),
    },
  }
})
