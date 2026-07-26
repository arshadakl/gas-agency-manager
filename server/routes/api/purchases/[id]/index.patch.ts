import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { purchases, purchaseItems, cylinderStock } from '~/server/database/schema'
import { PurchaseSchema } from '~/utils/validators'
import { validateStockChanges, commitStockChanges } from '~/server/utils/stock'
import type { CylinderSize } from '~/types'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery'])

  const publicId = getRouterParam(event, 'id')!
  const body = await parseBody(event, PurchaseSchema)
  const db = useDB(event)

  const existing = await db.select().from(purchases).where(eq(purchases.publicId, publicId)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Purchase not found' })

  const id = existing.id
  const oldItems = await db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, id)).all()

  // Auto-calculate connectionCharge from per-item cylinderCost.
  const totalCylinderCost = body.items.reduce((sum, i) => sum + (i.cylinderCost ?? 0), 0)
  body.connectionCharge = totalCylinderCost

  // Net stock impact of the edit = new changes minus old changes.
  const oldBySize = new Map(oldItems.map((i) => [i.sizeKg as CylinderSize, i]))
  const newBySize = new Map(body.items.map((i) => [i.sizeKg, i]))
  const allSizes = new Set([...oldBySize.keys(), ...newBySize.keys()])

  const netChanges = Array.from(allSizes).map((sizeKg) => {
    const old = oldBySize.get(sizeKg)
    const next = newBySize.get(sizeKg)
    return {
      sizeKg,
      fullChange: ((next?.receivedQty ?? 0) + (next?.newConnectionQty ?? 0))
        - ((old?.receivedQty ?? 0) + (old?.newConnectionQty ?? 0)),
      emptyChange: (-((next?.returnedQty ?? 0)) + (next?.emptyNewQty ?? 0))
        - (-((old?.returnedQty ?? 0)) + (old?.emptyNewQty ?? 0)),
    }
  }).filter((c) => c.fullChange !== 0 || c.emptyChange !== 0)

  if (netChanges.length > 0) await validateStockChanges(db, netChanges)

  // Net ownCount change per size.
  const ownUpdates = Array.from(allSizes).map((sizeKg) => {
    const old = oldBySize.get(sizeKg)
    const next = newBySize.get(sizeKg)
    const oldOwn = (old?.newConnectionQty ?? 0) + (old?.emptyNewQty ?? 0)
    const newOwn = (next?.newConnectionQty ?? 0) + (next?.emptyNewQty ?? 0)
    return { sizeKg, delta: newOwn - oldOwn }
  }).filter((u) => u.delta !== 0)

  // Payment status is derived against the grand total (gas + connection charge).
  const grandTotal = body.totalAmount + body.connectionCharge
  const paymentStatus =
    body.amountPaid >= grandTotal ? 'paid' :
    body.amountPaid > 0 ? 'partial' : 'pending'

  await db.update(purchases).set({
    supplier: body.supplier,
    purchaseDate: body.purchaseDate,
    invoiceNo: body.invoiceNo,
    totalAmount: body.totalAmount,
    connectionCharge: body.connectionCharge,
    amountPaid: body.amountPaid,
    paymentMode: body.paymentMode,
    paymentStatus,
    paymentReference: body.paymentReference,
    dueDate: body.dueDate,
    notes: body.notes,
  }).where(eq(purchases.id, id))

  await db.delete(purchaseItems).where(eq(purchaseItems.purchaseId, id))
  await db.insert(purchaseItems).values(body.items.map((i) => ({
    purchaseId: id,
    sizeKg: i.sizeKg,
    receivedQty: i.receivedQty,
    returnedQty: i.returnedQty,
    newConnectionQty: i.newConnectionQty,
    emptyNewQty: i.emptyNewQty ?? 0,
    cylinderCost: i.cylinderCost ?? 0,
    unitPrice: i.unitPrice ?? null,
  })))

  if (netChanges.length > 0) {
    await commitStockChanges(db, netChanges, 'adjustment', id, 'purchase', user, 'net stock impact of purchase edit')
  }

  // Apply net ownCount changes.
  for (const update of ownUpdates) {
    const current = await db.select().from(cylinderStock).where(eq(cylinderStock.sizeKg, update.sizeKg)).get()
    if (current) {
      await db.update(cylinderStock)
        .set({ ownCount: Math.max(0, current.ownCount + update.delta), updatedAt: new Date().toISOString() })
        .where(eq(cylinderStock.sizeKg, update.sizeKg))
    }
  }

  const updated = await db.select().from(purchases).where(eq(purchases.id, id)).get()
  if (!updated) throw createError({ statusCode: 500, message: 'Failed to retrieve updated purchase' })
  return { data: { ...updated, items: body.items } }
})
