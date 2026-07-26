import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { expenses } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery'])

  const publicId = getRouterParam(event, 'id')!
  const db = useDB(event)

  const row = await db.select().from(expenses).where(eq(expenses.publicId, publicId)).get()
  if (!row) throw createError({ statusCode: 404, message: 'Expense not found' })

  return { data: row }
})
