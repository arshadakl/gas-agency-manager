import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { purchases, purchasePayments } from '~/server/database/schema'
import { recordAccountTransaction } from '~/server/utils/account'
import type { AccountType } from '~/types'

const ClearSchema = z.object({
  payments: z.array(z.object({
    amount: z.number().positive(),
    paymentMode: z.enum(['cash', 'bank']),
  })).min(1),
  notes: z.string().max(500).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery'])

  const publicId = getRouterParam(event, 'id')!
  const body = await parseBody(event, ClearSchema)
  const db = useDB(event)

  const existing = await db.select().from(purchases).where(eq(purchases.publicId, publicId)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Purchase not found' })

  const grandTotal = existing.totalAmount + (existing.connectionCharge ?? 0)
  const remaining = Math.round((grandTotal - existing.amountPaid) * 100) / 100

  const totalClear = body.payments.reduce((sum, p) => sum + p.amount, 0)
  if (totalClear > remaining + 0.01) {
    throw createError({ statusCode: 422, message: `Amount exceeds remaining due of ₹${remaining.toFixed(2)}` })
  }

  const newAmountPaid = Math.round((existing.amountPaid + totalClear) * 100) / 100
  const newStatus = newAmountPaid >= grandTotal ? 'paid' : 'partial'

  await db.update(purchases)
    .set({ amountPaid: newAmountPaid, paymentStatus: newStatus })
    .where(eq(purchases.id, existing.id))

  // Record each payment in purchase_payments + account transactions
  await db.insert(purchasePayments).values(
    body.payments.map((p) => ({
      purchaseId: existing.id,
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
      transactionType: 'purchase_clear',
      referenceId: existing.id,
      referenceType: 'purchase',
      notes: body.notes ?? `Clear payment for purchase ${existing.supplier}`,
      user,
    })
  }

  return { data: { id: existing.id, amountPaid: newAmountPaid, paymentStatus: newStatus } }
})
