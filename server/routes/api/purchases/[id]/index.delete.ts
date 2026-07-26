import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { purchases, purchaseItems, cylinderStock } from '~/server/database/schema'
import { applyStockChanges } from '~/server/utils/stock'
import type { CylinderSize } from '~/types'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery'])

  const publicId = getRouterParam(event, 'id')!
  const db = useDB(event)

  const existing = await db.select().from(purchases).where(eq(purchases.publicId, publicId)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Purchase not found' })

  const id = existing.id
  const items = await db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, id)).all()

  const reversal = items
    .filter((i) => i.receivedQty > 0 || i.returnedQty > 0 || i.newConnectionQty > 0 || i.emptyNewQty > 0)
    .map((i) => ({
      sizeKg: i.sizeKg as CylinderSize,
      fullChange: -(i.receivedQty + i.newConnectionQty),
      emptyChange: i.returnedQty - i.emptyNewQty,
    }))
  if (reversal.length > 0) {
    await applyStockChanges(db, reversal, 'adjustment', id, 'purchase', user, 'reversal for purchase delete')
  }

  // Reverse ownCount changes.
  const ownUpdates = items.filter((i) => (i.newConnectionQty ?? 0) > 0 || (i.emptyNewQty ?? 0) > 0)
  for (const item of ownUpdates) {
    const ownQty = (item.newConnectionQty ?? 0) + (item.emptyNewQty ?? 0)
    const current = await db.select().from(cylinderStock).where(eq(cylinderStock.sizeKg, item.sizeKg)).get()
    if (current) {
      await db.update(cylinderStock)
        .set({ ownCount: Math.max(0, current.ownCount - ownQty), updatedAt: new Date().toISOString() })
        .where(eq(cylinderStock.sizeKg, item.sizeKg))
    }
  }

  await db.delete(purchaseItems).where(eq(purchaseItems.purchaseId, id))
  await db.delete(purchases).where(eq(purchases.id, id))

  return { data: null, message: 'Purchase deleted' }
})
