import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { deliveries, purchases, stockMovements } from '~/server/database/schema'
import { ReportQuerySchema } from '~/utils/validators'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])

  const { from, to } = parseQuery(event, ReportQuerySchema)
  const db = useDB(event)

  const [purchaseTotals, deliveryTotals, cylindersIn, cylindersOut] = await Promise.all([
    db.select({ totalAmount: sql<number>`coalesce(sum(${purchases.totalAmount}), 0)` })
      .from(purchases)
      .where(and(gte(purchases.purchaseDate, from), lte(purchases.purchaseDate, to)))
      .get(),
    db.select({ totalAmount: sql<number>`coalesce(sum(${deliveries.totalAmount}), 0)` })
      .from(deliveries)
      .where(and(eq(deliveries.status, 'delivered'), gte(deliveries.deliveryDate, from), lte(deliveries.deliveryDate, to)))
      .get(),
    db.select({ total: sql<number>`coalesce(sum(${stockMovements.fullChange}), 0)` })
      .from(stockMovements)
      .where(and(
        eq(stockMovements.movementType, 'purchase'),
        gte(sql`date(${stockMovements.createdAt})`, from),
        lte(sql`date(${stockMovements.createdAt})`, to),
      ))
      .get(),
    db.select({ total: sql<number>`coalesce(sum(${stockMovements.fullChange}), 0)` })
      .from(stockMovements)
      .where(and(
        eq(stockMovements.movementType, 'delivery'),
        gte(sql`date(${stockMovements.createdAt})`, from),
        lte(sql`date(${stockMovements.createdAt})`, to),
      ))
      .get(),
  ])

  return {
    data: {
      totalPurchased: purchaseTotals?.totalAmount ?? 0,
      totalDelivered: deliveryTotals?.totalAmount ?? 0,
      cylindersReceived: cylindersIn?.total ?? 0,
      cylindersDeliveredOut: Math.abs(cylindersOut?.total ?? 0),
    },
  }
})
