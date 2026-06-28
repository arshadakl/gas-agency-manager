import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { deliveries, deliveryItems, products } from '~/server/database/schema'
import { ReportQuerySchema } from '~/utils/validators'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])

  const { from, to } = parseQuery(event, ReportQuerySchema)
  const db = useDB(event)

  const rows = await db
    .select({
      sizeKg: products.cylinderSize,
      totalDelivered: sql<number>`coalesce(sum(${deliveryItems.quantity}), 0)`,
    })
    .from(deliveryItems)
    .innerJoin(deliveries, eq(deliveries.id, deliveryItems.deliveryId))
    .innerJoin(products, eq(products.id, deliveryItems.productId))
    .where(and(
      eq(deliveries.status, 'delivered'),
      eq(products.type, 'cylinder'),
      gte(deliveries.deliveryDate, from),
      lte(deliveries.deliveryDate, to),
    ))
    .groupBy(products.cylinderSize)
    .all()

  return { data: rows, total: rows.length }
})
