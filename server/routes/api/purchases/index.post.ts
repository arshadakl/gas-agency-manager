import { useDB } from '~/server/database'
import { purchases, purchaseItems } from '~/server/database/schema'
import { PurchaseSchema } from '~/utils/validators'
import { validateStockChanges, commitStockChanges } from '~/server/utils/stock'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin'])

  const body = await parseBody(event, PurchaseSchema)
  const db = useDB(event)

  const paymentStatus =
    body.amountPaid >= body.totalAmount ? 'paid' :
    body.amountPaid > 0 ? 'partial' : 'pending'

  // Purchase: full cylinders come in, empty cylinders go out — sequential, see §23.4 D1 note.
  const changes = body.items
    .filter((i) => i.receivedQty > 0 || i.returnedQty > 0)
    .map((i) => ({ sizeKg: i.sizeKg, fullChange: i.receivedQty, emptyChange: -i.returnedQty }))

  // Validate before any write — D1 has no rollback, so a failure here must
  // never leave an orphaned purchase record (see CLAUDE.md §23.4 D1 note).
  if (changes.length > 0) await validateStockChanges(db, changes)

  const [purchase] = await db.insert(purchases).values({
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
    createdBy: user.id,
    createdByName: user.fullName,
  }).returning()

  if (!purchase) throw createError({ statusCode: 500, message: 'Failed to create purchase' })

  await db.insert(purchaseItems).values(
    body.items.map((i) => ({ ...i, purchaseId: purchase.id })),
  )

  if (changes.length > 0) {
    await commitStockChanges(db, changes, 'purchase', purchase.id, 'purchase', user)
  }

  return { data: { ...purchase, items: body.items } }
})
