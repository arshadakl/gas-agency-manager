import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { cylinderStock, purchaseItems, purchases } from '~/server/database/schema'
import { ReportQuerySchema } from '~/utils/validators'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])

  const { from, to } = parseQuery(event, ReportQuerySchema)
  const db = useDB(event)

  // Current own cylinder counts per size (from cylinder_stock, not date-filtered).
  const currentStock = await db.select({
    sizeKg: cylinderStock.sizeKg,
    ownCount: cylinderStock.ownCount,
  }).from(cylinderStock).all()

  // Own cylinders purchased in the date range, grouped by size.
  const bySize = await db.select({
    sizeKg: purchaseItems.sizeKg,
    count: sql<number>`coalesce(sum(${purchaseItems.newConnectionQty} + ${purchaseItems.emptyNewQty}), 0)`,
    cost: sql<number>`coalesce(sum(${purchaseItems.cylinderCost}), 0)`,
  })
    .from(purchaseItems)
    .innerJoin(purchases, eq(purchases.id, purchaseItems.purchaseId))
    .where(and(
      gte(purchases.purchaseDate, from),
      lte(purchases.purchaseDate, to),
      sql`(${purchaseItems.newConnectionQty} + ${purchaseItems.emptyNewQty}) > 0`,
    ))
    .groupBy(purchaseItems.sizeKg)
    .all()

  // Total own cylinders and cost in the date range.
  const totals = await db.select({
    totalOwnCount: sql<number>`coalesce(sum(${purchaseItems.newConnectionQty} + ${purchaseItems.emptyNewQty}), 0)`,
    totalOwnCost: sql<number>`coalesce(sum(${purchaseItems.cylinderCost}), 0)`,
  })
    .from(purchaseItems)
    .innerJoin(purchases, eq(purchases.id, purchaseItems.purchaseId))
    .where(and(
      gte(purchases.purchaseDate, from),
      lte(purchases.purchaseDate, to),
      sql`(${purchaseItems.newConnectionQty} + ${purchaseItems.emptyNewQty}) > 0`,
    ))
    .get()

  // Individual purchases in range that had own cylinders, with their items.
  const purchaseRows = await db.select({
    id: purchases.id,
    publicId: purchases.publicId,
    purchaseDate: purchases.purchaseDate,
    supplier: purchases.supplier,
  })
    .from(purchases)
    .innerJoin(purchaseItems, eq(purchaseItems.purchaseId, purchases.id))
    .where(and(
      gte(purchases.purchaseDate, from),
      lte(purchases.purchaseDate, to),
      sql`(${purchaseItems.newConnectionQty} + ${purchaseItems.emptyNewQty}) > 0`,
    ))
    .groupBy(purchases.id)
    .all()

  const purchasesWithItems = await Promise.all(
    purchaseRows.map(async (p) => {
      const items = await db.select({
        sizeKg: purchaseItems.sizeKg,
        ownQty: sql<number>`${purchaseItems.newConnectionQty} + ${purchaseItems.emptyNewQty}`,
        cost: purchaseItems.cylinderCost,
      })
        .from(purchaseItems)
        .where(eq(purchaseItems.purchaseId, p.id))
        .all()
      return { publicId: p.publicId, purchaseDate: p.purchaseDate, supplier: p.supplier, items }
    }),
  )

  return {
    data: {
      totalOwnCount: totals?.totalOwnCount ?? 0,
      totalOwnCost: totals?.totalOwnCost ?? 0,
      currentStock: currentStock.map((r) => ({ sizeKg: r.sizeKg, ownCount: r.ownCount })),
      bySize,
      purchases: purchasesWithItems,
    },
  }
})
