import { sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { cylinderStock, purchaseItems, purchases } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])
  const db = useDB(event)

  // Current own cylinder counts per size from cylinder_stock.
  const stockRows = await db.select({
    sizeKg: cylinderStock.sizeKg,
    ownCount: cylinderStock.ownCount,
  }).from(cylinderStock).all()

  // Total cost of all own cylinders ever purchased.
  const costResult = await db.select({
    total: sql<number>`coalesce(sum(${purchaseItems.cylinderCost}), 0)`,
  }).from(purchaseItems).get()

  return {
    data: {
      bySize: stockRows.map((r) => ({ sizeKg: r.sizeKg, ownCount: r.ownCount })),
      totalOwnCount: stockRows.reduce((sum, r) => sum + r.ownCount, 0),
      totalOwnCost: costResult?.total ?? 0,
    },
  }
})
