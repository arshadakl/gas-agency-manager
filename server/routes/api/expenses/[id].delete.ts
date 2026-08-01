import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { expenses } from '~/server/database/schema'
import { reverseAccountTransaction } from '~/server/utils/account'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin'])

  const publicId = getRouterParam(event, 'id')!
  const db = useDB(event)

  const existing = await db.select().from(expenses).where(eq(expenses.publicId, publicId)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Expense not found' })

  // Reverse account transaction BEFORE deleting the expense record
  await reverseAccountTransaction(db, 'expense', existing.id, user)

  await db.delete(expenses).where(eq(expenses.id, existing.id))

  return { data: null, message: 'Expense deleted' }
})
