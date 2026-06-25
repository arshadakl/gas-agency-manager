import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { purchases, purchaseItems } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'viewer'])

  const id = Number(getRouterParam(event, 'id'))
  const db = useDB(event)

  const purchase = await db.select().from(purchases).where(eq(purchases.id, id)).get()
  if (!purchase) throw createError({ statusCode: 404, message: 'Purchase not found' })

  const items = await db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, id)).all()

  return { data: { ...purchase, items } }
})
