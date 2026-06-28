import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { purchases, purchaseItems } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])

  const publicId = getRouterParam(event, 'id')!
  const db = useDB(event)

  const purchase = await db.select().from(purchases).where(eq(purchases.publicId, publicId)).get()
  if (!purchase) throw createError({ statusCode: 404, message: 'Purchase not found' })

  const items = await db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, purchase.id)).all()

  return { data: { ...purchase, items } }
})
