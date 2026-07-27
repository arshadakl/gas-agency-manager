import { and, eq, gte, lte, desc, sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { deliveries, customerPayments, users } from '~/server/database/schema'
import { ReportQuerySchema } from '~/utils/validators'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])

  const { from, to } = parseQuery(event, ReportQuerySchema)
  const db = useDB(event)

  // Delivery stats per staff
  const deliveryRows = await db
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
    .all()

  // Payment collection stats per staff — cash and bank separately
  const paymentRows = await db
    .select({
      createdBy: customerPayments.createdBy,
      createdByName: customerPayments.createdByName,
      cashCollected: sql<number>`coalesce(sum(case when ${customerPayments.paymentMode} = 'cash' then ${customerPayments.amount} else 0 end), 0)`,
      bankCollected: sql<number>`coalesce(sum(case when ${customerPayments.paymentMode} = 'bank' then ${customerPayments.amount} else 0 end), 0)`,
      totalCollected: sql<number>`coalesce(sum(${customerPayments.amount}), 0)`,
      paymentCount: sql<number>`count(*)`,
    })
    .from(customerPayments)
    .where(and(
      gte(customerPayments.paymentDate, from),
      lte(customerPayments.paymentDate, to),
    ))
    .groupBy(customerPayments.createdBy)
    .all()

  // Merge delivery stats with payment stats
  const paymentMap = new Map(paymentRows.map((p) => [p.createdBy, p]))

  const mergedMap = new Map<number, {
    createdBy: number; createdByName: string; deliveryCount: number; totalValue: number;
    cashCollected: number; bankCollected: number; totalCollected: number; paymentCount: number;
  }>()

  for (const d of deliveryRows) {
    const payments = paymentMap.get(d.createdBy)
    mergedMap.set(d.createdBy, {
      createdBy: d.createdBy,
      createdByName: d.createdByName,
      deliveryCount: d.deliveryCount,
      totalValue: d.totalValue,
      cashCollected: payments?.cashCollected ?? 0,
      bankCollected: payments?.bankCollected ?? 0,
      totalCollected: payments?.totalCollected ?? 0,
      paymentCount: payments?.paymentCount ?? 0,
    })
  }

  // Include staff who collected payments but made no deliveries in this range
  for (const p of paymentRows) {
    if (!mergedMap.has(p.createdBy)) {
      mergedMap.set(p.createdBy, {
        createdBy: p.createdBy,
        createdByName: p.createdByName,
        deliveryCount: 0,
        totalValue: 0,
        cashCollected: p.cashCollected,
        bankCollected: p.bankCollected,
        totalCollected: p.totalCollected,
        paymentCount: p.paymentCount,
      })
    }
  }

  const rows = Array.from(mergedMap.values()).sort((a, b) => b.deliveryCount - a.deliveryCount)

  return { data: rows, total: rows.length }
})
