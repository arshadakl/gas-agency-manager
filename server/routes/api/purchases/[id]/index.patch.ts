import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { purchases, purchaseItems } from '~/server/database/schema'
import { PurchaseSchema } from '~/utils/validators'
import { validateStockChanges, commitStockChanges } from '~/server/utils/stock'
import type { CylinderSize } from '~/types'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery'])

  const id = Number(getRouterParam(event, 'id'))
  const body = await parseBody(event, PurchaseSchema)
  const db = useDB(event)

  const existing = await db.select().from(purchases).where(eq(purchases.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Purchase not found' })

  const oldItems = await db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, id)).all()

  // Net stock impact of the edit = new changes minus old changes, validated
  // and applied as a single change per size — never compute reversal and new
  // as two separate commits, since the intermediate (after reversal, before
  // the new change lands) can dip negative even when the net is valid, and a
  // partial failure between the two would leave the purchase record and the
  // stock table disagreeing with no way to roll back on D1 (see §23.4 D1 note).
  const oldBySize = new Map(oldItems.map((i) => [i.sizeKg as CylinderSize, i]))
  const newBySize = new Map(body.items.map((i) => [i.sizeKg, i]))
  const allSizes = new Set([...oldBySize.keys(), ...newBySize.keys()])

  const netChanges = Array.from(allSizes).map((sizeKg) => {
    const old = oldBySize.get(sizeKg)
    const next = newBySize.get(sizeKg)
    return {
      sizeKg,
      fullChange: (next?.receivedQty ?? 0) - (old?.receivedQty ?? 0),
      emptyChange: -((next?.returnedQty ?? 0) - (old?.returnedQty ?? 0)),
    }
  }).filter((c) => c.fullChange !== 0 || c.emptyChange !== 0)

  if (netChanges.length > 0) await validateStockChanges(db, netChanges)

  // Update purchase record + replace items
  const paymentStatus =
    body.amountPaid >= body.totalAmount ? 'paid' :
    body.amountPaid > 0 ? 'partial' : 'pending'

  await db.update(purchases).set({
    supplier: body.supplier,
    purchaseDate: body.purchaseDate,
    invoiceNo: body.invoiceNo,
    totalAmount: body.totalAmount,
    amountPaid: body.amountPaid,
    paymentMode: body.paymentMode,
    paymentStatus,
    paymentReference: body.paymentReference,
    dueDate: body.dueDate,
    notes: body.notes,
  }).where(eq(purchases.id, id))

  await db.delete(purchaseItems).where(eq(purchaseItems.purchaseId, id))
  await db.insert(purchaseItems).values(body.items.map((i) => ({ ...i, purchaseId: id })))

  if (netChanges.length > 0) {
    await commitStockChanges(db, netChanges, 'adjustment', id, 'purchase', user, 'net stock impact of purchase edit')
  }

  const updated = await db.select().from(purchases).where(eq(purchases.id, id)).get()
  if (!updated) throw createError({ statusCode: 500, message: 'Failed to retrieve updated purchase' })
  return { data: { ...updated, items: body.items } }
})
