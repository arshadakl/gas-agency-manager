import { eq, desc } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { purchases, purchasePayments } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])

  const publicId = getRouterParam(event, 'id')!
  const db = useDB(event)

  const purchase = await db.select({ id: purchases.id }).from(purchases).where(eq(purchases.publicId, publicId)).get()
  if (!purchase) throw createError({ statusCode: 404, message: 'Purchase not found' })

  const payments = await db.select()
    .from(purchasePayments)
    .where(eq(purchasePayments.purchaseId, purchase.id))
    .orderBy(desc(purchasePayments.createdAt))
    .all()

  return { data: payments }
})
