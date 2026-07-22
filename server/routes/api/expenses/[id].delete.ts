import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { expenses } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid expense ID' })
  }

  const db = useDB(event)

  const existing = await db.select().from(expenses).where(eq(expenses.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Expense not found' })

  await db.delete(expenses).where(eq(expenses.id, id))

  return { data: null, message: 'Expense deleted' }
})
