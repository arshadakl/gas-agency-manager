import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { expenses } from '~/server/database/schema'
import { EXPENSE_TAGS } from '~/types'
import type { AccountType } from '~/types'
import { reverseAccountTransaction, recordAccountTransaction } from '~/server/utils/account'

const UpdateExpenseSchema = z.object({
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amount: z.number().positive().optional(),
  tag: z.enum(EXPENSE_TAGS).optional(),
  paymentSource: z.enum(['cash', 'bank']).optional(),
  notes: z.string().max(500).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery'])

  const publicId = getRouterParam(event, 'id')!
  const body = await parseBody(event, UpdateExpenseSchema)
  const db = useDB(event)

  const existing = await db.select().from(expenses).where(eq(expenses.publicId, publicId)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Expense not found' })

  // Determine what changed for account sync
  const amountChanged = body.amount !== undefined && body.amount !== existing.amount
  const sourceChanged = body.paymentSource !== undefined && body.paymentSource !== existing.paymentSource
  const needsAccountSync = amountChanged || sourceChanged

  // Reverse old account transaction if amount or source changed
  if (needsAccountSync) {
    await reverseAccountTransaction(db, 'expense', existing.id, user)
  }

  const [updated] = await db.update(expenses)
    .set({
      ...(body.expenseDate !== undefined ? { expenseDate: body.expenseDate } : {}),
      ...(body.amount !== undefined ? { amount: body.amount } : {}),
      ...(body.tag !== undefined ? { tag: body.tag } : {}),
      ...(body.paymentSource !== undefined ? { paymentSource: body.paymentSource } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    })
    .where(eq(expenses.id, existing.id))
    .returning()

  if (!updated) throw createError({ statusCode: 500, message: 'Failed to update expense' })

  // Record new account transaction with updated values
  if (needsAccountSync) {
    const newAmount = body.amount ?? existing.amount
    const newSource = (body.paymentSource ?? existing.paymentSource) as AccountType
    await recordAccountTransaction(db, {
      accountType: newSource,
      amount: -newAmount,
      transactionType: 'expense',
      referenceId: updated.id,
      referenceType: 'expense',
      notes: body.notes ?? existing.notes ?? undefined,
      user,
    })
  }

  return { data: updated }
})
