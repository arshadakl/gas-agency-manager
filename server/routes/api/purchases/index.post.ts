import { useDB } from '~/server/database'
import { purchases, purchaseItems } from '~/server/database/schema'
import { PurchaseSchema } from '~/utils/validators'
import { validateStockChanges, commitStockChanges } from '~/server/utils/stock'
import { recordAccountTransaction } from '~/server/utils/account'
import { generateId } from '~/server/utils/id'
import type { AccountType } from '~/types'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery'])

  const body = await parseBody(event, PurchaseSchema)
  const db = useDB(event)

  // Payment status is derived against the grand total (gas + connection charge).
  const grandTotal = body.totalAmount + body.connectionCharge
  const paymentStatus =
    body.amountPaid >= grandTotal ? 'paid' :
    body.amountPaid > 0 ? 'partial' : 'pending'

  // Purchase: refill exchange (full in, empty out) + brand-new connection
  // cylinders (full in, no empty out) — sequential, see §23.4 D1 note.
  const changes = body.items
    .filter((i) => i.receivedQty > 0 || i.returnedQty > 0 || i.newConnectionQty > 0)
    .map((i) => ({ sizeKg: i.sizeKg, fullChange: i.receivedQty + i.newConnectionQty, emptyChange: -i.returnedQty }))

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
      unitPrice: i.unitPrice ?? null,
    })),
  )

  if (changes.length > 0) {
    await commitStockChanges(db, changes, 'purchase', purchase.id, 'purchase', user)
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
