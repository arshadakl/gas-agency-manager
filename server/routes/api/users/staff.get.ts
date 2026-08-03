import { and, eq, ne } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { users } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery'])
  const db = useDB(event)

  const rows = await db.select({
    id: users.id,
    fullName: users.fullName,
  }).from(users).where(and(eq(users.isActive, 1), ne(users.role, 'admin'))).all()

  return { data: rows }
})
