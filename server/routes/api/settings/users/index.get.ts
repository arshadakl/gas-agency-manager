import { useDB } from '~/server/database'
import { users } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])

  const db = useDB(event)
  const rows = await db.select({
    id: users.id,
    username: users.username,
    fullName: users.fullName,
    role: users.role,
    isActive: users.isActive,
    createdAt: users.createdAt,
  }).from(users).all()

  return { data: rows, total: rows.length }
})
