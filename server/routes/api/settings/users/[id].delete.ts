import { eq, and, ne, sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { users } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const admin = await requireRole(event, ['admin'])
  const userId = parseInt(getRouterParam(event, 'id') || '0')

  if (!userId) throw createError({ statusCode: 400, message: 'Invalid user ID' })
  if (userId === admin.id) {
    throw createError({ statusCode: 403, message: 'Cannot delete your own account' })
  }

  const db = useDB(event)
  const target = await db.select().from(users).where(eq(users.id, userId)).get()
  if (!target) throw createError({ statusCode: 404, message: 'User not found' })

  if (target.role === 'admin' && target.isActive) {
    const otherActiveAdmins = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.role, 'admin'), eq(users.isActive, 1), ne(users.id, userId)))
      .get()
    if (!otherActiveAdmins || otherActiveAdmins.count === 0) {
      throw createError({ statusCode: 422, message: 'Cannot delete the last active admin' })
    }
  }

  await db.delete(users).where(eq(users.id, userId))

  return { data: { message: 'User deleted' } }
})
