import { eq, sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { purchases, purchaseItems, purchasePayments, cylinderStock } from '~/server/database/schema'
import { applyStockChanges } from '~/server/utils/stock'
import { reverseAccountTransaction } from '~/server/utils/account'
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

  // Reverse ownCount changes — atomic decrement
  const ownUpdates = items.filter((i) => (i.newConnectionQty ?? 0) > 0 || (i.emptyNewQty ?? 0) > 0)
  for (const item of ownUpdates) {
    const ownQty = (item.newConnectionQty ?? 0) + (item.emptyNewQty ?? 0)
    await db.update(cylinderStock)
      .set({ ownCount: sql`max(0, ${cylinderStock.ownCount} - ${ownQty})`, updatedAt: new Date().toISOString() })
      .where(eq(cylinderStock.sizeKg, item.sizeKg))
  }

  // Reverse all account transactions for this purchase.
  await reverseAccountTransaction(db, 'purchase', id, user)

  // Delete purchase_payments, purchase_items, then purchase.
  await db.delete(purchasePayments).where(eq(purchasePayments.purchaseId, id))
  await db.delete(purchaseItems).where(eq(purchaseItems.purchaseId, id))
  await db.delete(purchases).where(eq(purchases.id, id))

  return { data: null, message: 'Purchase deleted' }
})
