import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { purchases, purchaseItems, purchasePayments, cylinderStock } from '~/server/database/schema'
import { PurchaseSchema } from '~/utils/validators'
import { validateStockChanges, commitStockChanges } from '~/server/utils/stock'
import { recordAccountTransaction, reverseAccountTransaction, getAccountBalance } from '~/server/utils/account'
import type { CylinderSize, AccountType } from '~/types'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery'])

  const publicId = getRouterParam(event, 'id')!
  const body = await parseBody(event, PurchaseSchema)
  const db = useDB(event)

  const existing = await db.select().from(purchases).where(eq(purchases.publicId, publicId)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Purchase not found' })

  const id = existing.id
  const oldItems = await db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, id)).all()
  const oldPayments = await db.select().from(purchasePayments).where(eq(purchasePayments.purchaseId, id)).all()

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

  // Validate account balances before any write — simulate reversal + new payments.
  // Old payments are reversed (credited back), then new payments are deducted.
  const balanceAdjustments = new Map<string, number>()
  for (const op of oldPayments) {
    const key = op.paymentMode
    balanceAdjustments.set(key, (balanceAdjustments.get(key) ?? 0) + op.amount)
  }
  for (const np of body.payments) {
    const key = np.paymentMode
    balanceAdjustments.set(key, (balanceAdjustments.get(key) ?? 0) - np.amount)
  }
  for (const [mode, delta] of balanceAdjustments) {
    if (delta < 0) {
      const balance = await getAccountBalance(db, mode as AccountType)
      if (balance + delta < 0) {
        throw createError({
          statusCode: 422,
          message: `Insufficient ${mode} balance. Available: ₹${balance.toLocaleString('en-IN')}, needed: ₹${Math.abs(delta).toLocaleString('en-IN')}`,
        })
      }
    }
  }

  // Net ownCount change per size.
  const ownUpdates = Array.from(allSizes).map((sizeKg) => {
    const old = oldBySize.get(sizeKg)
    const next = newBySize.get(sizeKg)
    const oldOwn = (old?.newConnectionQty ?? 0) + (old?.emptyNewQty ?? 0)
    const newOwn = (next?.newConnectionQty ?? 0) + (next?.emptyNewQty ?? 0)
    return { sizeKg, delta: newOwn - oldOwn }
  }).filter((u) => u.delta !== 0)

  // Derive payment status from new payments[] array.
  const amountPaid = body.payments.reduce((sum, p) => sum + p.amount, 0)
  const grandTotal = body.totalAmount + body.connectionCharge
  const paymentStatus =
    amountPaid >= grandTotal ? 'paid' :
    amountPaid > 0 ? 'partial' : 'pending'

  await db.update(purchases).set({
    supplier: body.supplier,
    purchaseDate: body.purchaseDate,
    invoiceNo: body.invoiceNo,
    totalAmount: body.totalAmount,
    connectionCharge: body.connectionCharge,
    amountPaid,
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
    await commitStockChanges(db, netChanges, 'purchase', id, 'purchase', user, 'net stock impact of purchase edit')
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

  // Reverse old account transactions, then create new ones from new payments[].
  if (oldPayments.length > 0) {
    await reverseAccountTransaction(db, 'purchase', id, user)
  }
  await db.delete(purchasePayments).where(eq(purchasePayments.purchaseId, id))
  if (body.payments.length > 0) {
    await db.insert(purchasePayments).values(
      body.payments.map((p) => ({
        purchaseId: id,
        amount: p.amount,
        paymentMode: p.paymentMode,
        createdBy: user.id,
        createdByName: user.fullName,
      })),
    )
    for (const p of body.payments) {
      await recordAccountTransaction(db, {
        accountType: p.paymentMode as AccountType,
        amount: -p.amount,
        transactionType: 'purchase_paid',
        referenceId: id,
        referenceType: 'purchase',
        notes: `Purchase from ${body.supplier}`,
        user,
      })
    }
  }

  const updated = await db.select().from(purchases).where(eq(purchases.id, id)).get()
  if (!updated) throw createError({ statusCode: 500, message: 'Failed to retrieve updated purchase' })
  return { data: { ...updated, items: body.items } }
})
