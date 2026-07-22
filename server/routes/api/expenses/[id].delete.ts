import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { expenses } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])

  const publicId = getRouterParam(event, 'id')!
  const db = useDB(event)

  const existing = await db.select().from(expenses).where(eq(expenses.publicId, publicId)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Expense not found' })

  await db.delete(expenses).where(eq(expenses.id, existing.id))

  return { data: null, message: 'Expense deleted' }
})
