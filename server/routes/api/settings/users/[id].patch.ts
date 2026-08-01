import { eq, and, ne, sql } from 'drizzle-orm'
import { z } from 'zod'
import { useDB } from '~/server/database'
import { users } from '~/server/database/schema'
import { ROLES, ADMIN_ONLY_FEATURES, type FeatureKey } from '~/types'
import { PasswordChangeSchema } from '~/utils/validators'

const AdminUpdateSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  role: z.enum([ROLES.ADMIN, ROLES.DELIVERY, ROLES.VIEWER]).optional(),
  isActive: z.boolean().optional(),
  newPassword: z.string().min(8).max(100).optional(),
  featuresDisabled: z.array(z.string()).optional(),
})

export default defineEventHandler(async (event) => {
  const currentUser = await requireUser(event)
  const publicId = getRouterParam(event, 'id')!
  const db = useDB(event)

  const target = await db.select().from(users).where(eq(users.publicId, publicId)).get()
  if (!target) throw createError({ statusCode: 404, message: 'User not found' })

  const isSelf = currentUser.id === target.id
  const isAdmin = currentUser.role === 'admin'
  const canManage = isAdmin || (currentUser.role === 'delivery' && Array.isArray(currentUser.featuresDisabled) && !currentUser.featuresDisabled.includes('manage_users'))

  if (!isSelf && !canManage) throw createError({ statusCode: 403, message: 'Forbidden' })

  let updates: Partial<typeof users.$inferInsert> = {}

  if (isSelf && !isAdmin) {
    const body = await parseBody(event, PasswordChangeSchema)
    const valid = await verifyPassword(body.currentPassword, target.passwordHash)
    if (!valid) throw createError({ statusCode: 401, message: 'Current password is incorrect' })
    updates.passwordHash = await hashPassword(body.newPassword)
  } else {
    const body = await parseBody(event, AdminUpdateSchema)

    // Non-admin managers cannot set admin-only features
    if (!isAdmin && body.featuresDisabled) {
      body.featuresDisabled = body.featuresDisabled.filter(f => !ADMIN_ONLY_FEATURES.includes(f as FeatureKey))
    }

    // Non-admin managers cannot change roles or deactivate users
    if (!isAdmin) {
      delete body.role
      delete body.isActive
    }

    const isDemoting = body.role !== undefined && body.role !== 'admin'
    const isDeactivating = body.isActive === false
    if (target.role === 'admin' && target.isActive && (isDemoting || isDeactivating)) {
      const otherActiveAdmins = await db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(eq(users.role, 'admin'), eq(users.isActive, 1), ne(users.id, target.id)))
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
      ...(body.featuresDisabled !== undefined ? { featuresDisabled: JSON.stringify(body.featuresDisabled) } : {}),
    }
  }

  const [updated] = await db.update(users)
    .set(updates)
    .where(eq(users.id, target.id))
    .returning({
      id: users.id,
      publicId: users.publicId,
      username: users.username,
      fullName: users.fullName,
      role: users.role,
      isActive: users.isActive,
      featuresDisabled: users.featuresDisabled,
      createdAt: users.createdAt,
    })

  if (!updated) throw createError({ statusCode: 500, message: 'Failed to update user' })

  return { data: updated }
})
