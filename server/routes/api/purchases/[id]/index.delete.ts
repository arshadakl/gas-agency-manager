import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { purchases, purchaseItems } from '~/server/database/schema'
import { applyStockChanges } from '~/server/utils/stock'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin'])

  const id = Number(getRouterParam(event, 'id'))
  const db = useDB(event)

  const existing = await db.select().from(purchases).where(eq(purchases.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Purchase not found' })

  const items = await db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, id)).all()

  const reversal = items
    .filter((i) => i.receivedQty > 0 || i.returnedQty > 0)
    .map((i) => ({
      sizeKg: i.sizeKg as 12 | 17 | 33,
      fullChange: -i.receivedQty,
      emptyChange: i.returnedQty,
    }))
  if (reversal.length > 0) {
    await applyStockChanges(db, reversal, 'adjustment', id, 'purchase', user, 'reversal for purchase delete')
  }

  await db.delete(purchaseItems).where(eq(purchaseItems.purchaseId, id))
  await db.delete(purchases).where(eq(purchases.id, id))

  return { data: null, message: 'Purchase deleted' }
})
