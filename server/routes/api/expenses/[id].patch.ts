import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { expenses } from '~/server/database/schema'
import { EXPENSE_TAGS } from '~/types'

const UpdateExpenseSchema = z.object({
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amount: z.number().positive().optional(),
  tag: z.enum(EXPENSE_TAGS).optional(),
  notes: z.string().max(500).optional(),
})

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery'])

  const publicId = getRouterParam(event, 'id')!
  const body = await parseBody(event, UpdateExpenseSchema)
  const db = useDB(event)

  const existing = await db.select().from(expenses).where(eq(expenses.publicId, publicId)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Expense not found' })

  const [updated] = await db.update(expenses)
    .set({
      ...(body.expenseDate !== undefined ? { expenseDate: body.expenseDate } : {}),
      ...(body.amount !== undefined ? { amount: body.amount } : {}),
      ...(body.tag !== undefined ? { tag: body.tag } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    })
    .where(eq(expenses.id, existing.id))
    .returning()

  if (!updated) throw createError({ statusCode: 500, message: 'Failed to update expense' })

  return { data: updated }
})
