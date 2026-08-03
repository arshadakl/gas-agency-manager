import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { users } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery'])
  const db = useDB(event)

  const rows = await db.select({
    id: users.id,
    fullName: users.fullName,
  }).from(users).where(eq(users.isActive, 1)).all()

  return { data: rows }
})
