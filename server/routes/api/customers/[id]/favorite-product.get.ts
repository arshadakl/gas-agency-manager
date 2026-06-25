import { eq, desc, sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { deliveryItems, deliveries } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])

  const customerId = Number(getRouterParam(event, 'id'))
  const db = useDB(event)

  const row = await db
    .select({
      productId: deliveryItems.productId,
      count: sql<number>`count(*)`,
    })
    .from(deliveryItems)
    .innerJoin(deliveries, eq(deliveries.id, deliveryItems.deliveryId))
    .where(eq(deliveries.customerId, customerId))
    .groupBy(deliveryItems.productId)
    .orderBy(desc(sql`count(*)`))
    .limit(1)
    .get()

  return { data: row ? { productId: row.productId } : null }
})
