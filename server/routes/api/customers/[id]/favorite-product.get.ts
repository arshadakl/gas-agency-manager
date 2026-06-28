import { and, eq, desc, sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { deliveryItems, deliveries, customers } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])

  const publicId = getRouterParam(event, 'id')!
  const db = useDB(event)

  const customer = await db.select({ id: customers.id }).from(customers).where(eq(customers.publicId, publicId)).get()
  if (!customer) throw createError({ statusCode: 404, message: 'Customer not found' })

  const row = await db
    .select({
      productId: deliveryItems.productId,
      count: sql<number>`count(*)`,
    })
    .from(deliveryItems)
    .innerJoin(deliveries, eq(deliveries.id, deliveryItems.deliveryId))
    .where(and(eq(deliveries.customerId, customer.id), eq(deliveries.status, 'delivered')))
    .groupBy(deliveryItems.productId)
    .orderBy(desc(sql`count(*)`))
    .limit(1)
    .get()

  return { data: row ? { productId: row.productId } : null }
})
