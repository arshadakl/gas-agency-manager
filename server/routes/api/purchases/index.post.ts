import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { purchases, purchaseItems, purchasePayments, cylinderStock } from '~/server/database/schema'
import { PurchaseSchema } from '~/utils/validators'
import { validateStockChanges, commitStockChanges } from '~/server/utils/stock'
import { recordAccountTransaction, getAccountBalance } from '~/server/utils/account'
import { generateId } from '~/server/utils/id'
import type { AccountType, CylinderSize } from '~/types'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery'])

  const body = await parseBody(event, PurchaseSchema)
  const db = useDB(event)

  // Auto-calculate connectionCharge from per-item cylinderCost.
  const totalCylinderCost = body.items.reduce((sum, i) => sum + (i.cylinderCost ?? 0), 0)
  body.connectionCharge = totalCylinderCost

  // Derive payment status from payments[] array.
  const amountPaid = body.payments.reduce((sum, p) => sum + p.amount, 0)
  const grandTotal = body.totalAmount + body.connectionCharge
  const paymentStatus =
    amountPaid >= grandTotal ? 'paid' :
    amountPaid > 0 ? 'partial' : 'pending'

  // Stock: refill exchange (full in, empty out) + new connection (full in, no empty out)
  // + empty new cylinders (empty in, no full). Sequential — see §23.4 D1 note.
  const changes = body.items
    .filter((i) => i.receivedQty > 0 || i.returnedQty > 0 || i.newConnectionQty > 0 || i.emptyNewQty > 0)
    .map((i) => ({
      sizeKg: i.sizeKg,
      fullChange: i.receivedQty + i.newConnectionQty,
      emptyChange: -i.returnedQty + i.emptyNewQty,
    }))

  // Validate before any write — D1 has no rollback, so a failure here must
  // never leave an orphaned purchase record (see CLAUDE.md §23.4 D1 note).
  if (changes.length > 0) await validateStockChanges(db, changes)

  // Validate account balances before any write — prevent purchase from being
  // created with wrong paymentStatus if account has insufficient funds.
  for (const p of body.payments) {
    const balance = await getAccountBalance(db, p.paymentMode as AccountType)
    if (balance - p.amount < 0) {
      throw createError({
        statusCode: 422,
        message: `Insufficient ${p.paymentMode} balance. Available: ₹${balance.toLocaleString('en-IN')}`,
      })
    }
  }

  const [purchase] = await db.insert(purchases).values({
    publicId: generateId(),
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
    purchaseType: body.purchaseType,
    createdBy: user.id,
    createdByName: user.fullName,
  }).returning()

  if (!purchase) throw createError({ statusCode: 500, message: 'Failed to create purchase' })

  await db.insert(purchaseItems).values(
    body.items.map((i) => ({
      purchaseId: purchase.id,
      sizeKg: i.sizeKg,
      receivedQty: i.receivedQty,
      returnedQty: i.returnedQty,
      newConnectionQty: i.newConnectionQty,
      emptyNewQty: i.emptyNewQty ?? 0,
      cylinderCost: i.cylinderCost ?? 0,
      unitPrice: i.unitPrice ?? null,
    })),
  )

  if (changes.length > 0) {
    await commitStockChanges(db, changes, 'purchase', purchase.id, 'purchase', user)
  }

  // Update ownCount on cylinder_stock for each size with own cylinders.
  const ownUpdates = body.items.filter((i) => (i.newConnectionQty ?? 0) > 0 || (i.emptyNewQty ?? 0) > 0)
  for (const item of ownUpdates) {
    const ownQty = (item.newConnectionQty ?? 0) + (item.emptyNewQty ?? 0)
    const current = await db.select().from(cylinderStock).where(eq(cylinderStock.sizeKg, item.sizeKg)).get()
    if (current) {
      await db.update(cylinderStock)
        .set({ ownCount: current.ownCount + ownQty, updatedAt: new Date().toISOString() })
        .where(eq(cylinderStock.sizeKg, item.sizeKg))
    }
  }

  // Record each payment in purchase_payments + account transactions
  // MUST happen before returning — if account transaction fails (insufficient balance),
  // the purchase stays with paymentStatus = 'pending' (correct).
  if (body.payments.length > 0) {
    await db.insert(purchasePayments).values(
      body.payments.map((p) => ({
        purchaseId: purchase.id,
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
        referenceId: purchase.id,
        referenceType: 'purchase',
        notes: `Purchase from ${body.supplier}`,
        user,
      })
    }
  }

  return { data: { ...purchase, items: body.items } }
})
