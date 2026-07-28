import { ne } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { users } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const isAdmin = user.role === 'admin'
  const canManage = isAdmin || (Array.isArray(user.featuresDisabled) && !user.featuresDisabled.includes('manage_users'))
  if (!canManage) throw createError({ statusCode: 403, message: 'Forbidden' })

  const db = useDB(event)
  const rows = await db.select({
    id: users.id,
    publicId: users.publicId,
    username: users.username,
    fullName: users.fullName,
    role: users.role,
    isActive: users.isActive,
    featuresDisabled: users.featuresDisabled,
    createdAt: users.createdAt,
  }).from(users).where(ne(users.role, 'admin')).all()

  return { data: rows, total: rows.length }
})
