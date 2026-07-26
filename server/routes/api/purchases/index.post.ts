import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { purchases, purchaseItems, cylinderStock } from '~/server/database/schema'
import { PurchaseSchema } from '~/utils/validators'
import { validateStockChanges, commitStockChanges } from '~/server/utils/stock'
import { recordAccountTransaction } from '~/server/utils/account'
import { generateId } from '~/server/utils/id'
import type { AccountType, CylinderSize } from '~/types'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery'])

  const body = await parseBody(event, PurchaseSchema)
  const db = useDB(event)

  // Auto-calculate connectionCharge from per-item cylinderCost.
  const totalCylinderCost = body.items.reduce((sum, i) => sum + (i.cylinderCost ?? 0), 0)
  body.connectionCharge = totalCylinderCost

  // Payment status is derived against the grand total (gas + connection charge).
  const grandTotal = body.totalAmount + body.connectionCharge
  const paymentStatus =
    body.amountPaid >= grandTotal ? 'paid' :
    body.amountPaid > 0 ? 'partial' : 'pending'

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

  const [purchase] = await db.insert(purchases).values({
    publicId: generateId(),
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

  // Track payment in accounts if cash or bank
  if (body.amountPaid > 0 && body.paymentMode && (body.paymentMode === 'cash' || body.paymentMode === 'bank')) {
    await recordAccountTransaction(db, {
      accountType: body.paymentMode as AccountType,
      amount: -body.amountPaid,
      transactionType: 'purchase_paid',
      referenceId: purchase.id,
      referenceType: 'purchase',
      notes: `Purchase from ${body.supplier}`,
      user,
    })
  }

  return { data: { ...purchase, items: body.items } }
})
