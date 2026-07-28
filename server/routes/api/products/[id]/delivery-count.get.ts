import { eq, sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { products, deliveryItems } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery'])

  const publicId = getRouterParam(event, 'id')!
  const db = useDB(event)

  const product = await db.select({ id: products.id }).from(products).where(eq(products.publicId, publicId)).get()
  if (!product) throw createError({ statusCode: 404, message: 'Product not found' })

  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(deliveryItems)
    .where(eq(deliveryItems.productId, product.id))
    .all()

  return { data: { count: row?.count ?? 0 } }
})
