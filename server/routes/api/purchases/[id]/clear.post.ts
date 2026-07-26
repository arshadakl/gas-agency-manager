import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { purchases } from '~/server/database/schema'
import { recordAccountTransaction } from '~/server/utils/account'
import type { AccountType } from '~/types'

const ClearSchema = z.object({
  amount: z.number().positive(),
  paymentMode: z.enum(['cash', 'bank']),
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

  if (body.amount > remaining + 0.01) {
    throw createError({ statusCode: 422, message: `Amount exceeds remaining due of ₹${remaining.toFixed(2)}` })
  }

  const newAmountPaid = Math.round((existing.amountPaid + body.amount) * 100) / 100
  const newStatus = newAmountPaid >= grandTotal ? 'paid' : 'partial'

  await db.update(purchases)
    .set({ amountPaid: newAmountPaid, paymentStatus: newStatus })
    .where(eq(purchases.id, existing.id))

  // Track in accounts
  await recordAccountTransaction(db, {
    accountType: body.paymentMode as AccountType,
    amount: -body.amount,
    transactionType: 'purchase_clear',
    referenceId: existing.id,
    referenceType: 'purchase',
    notes: body.notes ?? `Clear payment for purchase ${existing.supplier}`,
    user,
  })

  return { data: { id: existing.id, amountPaid: newAmountPaid, paymentStatus: newStatus } }
})
