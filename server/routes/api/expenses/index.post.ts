import { z } from 'zod'
import { useDB } from '~/server/database'
import { expenses } from '~/server/database/schema'
import { EXPENSE_TAGS } from '~/types'
import { generateId } from '~/server/utils/id'

const CreateExpenseSchema = z.object({
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().positive(),
  tag: z.enum(EXPENSE_TAGS),
  notes: z.string().max(500).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery'])
  const body = await parseBody(event, CreateExpenseSchema)
  const db = useDB(event)

  const [created] = await db.insert(expenses).values({
    publicId: generateId(),
    expenseDate: body.expenseDate,
    amount: body.amount,
    tag: body.tag,
    notes: body.notes,
    createdBy: user.id,
    createdByName: user.fullName,
  }).returning()

  if (!created) throw createError({ statusCode: 500, message: 'Failed to create expense' })

  return { data: created }
})
