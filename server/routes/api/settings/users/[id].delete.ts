import { eq } from 'drizzle-orm'
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
  const user = await db.select()
    .from(users)
    .where(eq(users.id, userId))
    .get()

  if (!user) throw createError({ statusCode: 404, message: 'User not found' })

  // Soft delete — set is_active to 0
  await db.update(users)
    .set({ isActive: 0 })
    .where(eq(users.id, userId))

  return { data: { message: 'User deactivated' } }
})
