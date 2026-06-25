import { eq, sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { products, inventory } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'viewer'])

  const db = useDB(event)

  const rows = await db
    .select({
      productId: products.id,
      productName: products.name,
      type: products.type,
      cylinderSize: products.cylinderSize,
      unit: products.unit,
      quantity: sql<number>`coalesce(${inventory.quantity}, 0)`,
    })
    .from(products)
    .leftJoin(inventory, eq(inventory.productId, products.id))
    .where(eq(products.isActive, 1))
    .all()

  return { data: rows, total: rows.length }
})
