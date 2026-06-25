import { eq, and, ne, sql } from 'drizzle-orm'
import { z } from 'zod'
import { useDB } from '~/server/database'
import { users } from '~/server/database/schema'
import { ROLES } from '~/types'
import { PasswordChangeSchema } from '~/utils/validators'

const AdminUpdateSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  role: z.enum([ROLES.ADMIN, ROLES.DELIVERY, ROLES.VIEWER]).optional(),
  isActive: z.boolean().optional(),
  newPassword: z.string().min(8).max(100).optional(),
})

export default defineEventHandler(async (event) => {
  const currentUser = await requireUser(event)
  const id = Number(getRouterParam(event, 'id'))
  const db = useDB(event)

  const target = await db.select().from(users).where(eq(users.id, id)).get()
  if (!target) throw createError({ statusCode: 404, message: 'User not found' })

  const isSelf = currentUser.id === id
  const isAdmin = currentUser.role === 'admin'

  if (!isSelf && !isAdmin) throw createError({ statusCode: 403, message: 'Forbidden' })

  let updates: Partial<typeof users.$inferInsert> = {}

  if (isSelf && !isAdmin) {
    const body = await parseBody(event, PasswordChangeSchema)
    const valid = await verifyPassword(body.currentPassword, target.passwordHash)
    if (!valid) throw createError({ statusCode: 401, message: 'Current password is incorrect' })
    updates.passwordHash = await hashPassword(body.newPassword)
  } else {
    const body = await parseBody(event, AdminUpdateSchema)

    // Never let the last active admin demote/deactivate themselves (or be
    // demoted/deactivated) — there'd be no one left who can promote anyone
    // back, locking the whole team out of user management.
    const isDemoting = body.role !== undefined && body.role !== 'admin'
    const isDeactivating = body.isActive === false
    if (target.role === 'admin' && target.isActive && (isDemoting || isDeactivating)) {
      const otherActiveAdmins = await db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(eq(users.role, 'admin'), eq(users.isActive, 1), ne(users.id, id)))
        .get()
      if (!otherActiveAdmins || otherActiveAdmins.count === 0) {
        throw createError({ statusCode: 422, message: 'Cannot remove the last active admin' })
      }
    }

    updates = {
      ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
      ...(body.role !== undefined ? { role: body.role } : {}),
      ...(body.isActive !== undefined ? { isActive: Number(body.isActive) } : {}),
      ...(body.newPassword ? { passwordHash: await hashPassword(body.newPassword) } : {}),
    }
  }

  const [updated] = await db.update(users)
    .set(updates)
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })

  if (!updated) throw createError({ statusCode: 500, message: 'Failed to update user' })

  return { data: updated }
})
