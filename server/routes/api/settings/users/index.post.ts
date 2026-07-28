import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { users } from '~/server/database/schema'
import { UserSchema } from '~/utils/validators'
import { generateId } from '~/server/utils/id'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const isAdmin = user.role === 'admin'
  const canManage = isAdmin || (user.role === 'delivery' && Array.isArray(user.featuresDisabled) && !user.featuresDisabled.includes('manage_users'))
  if (!canManage) throw createError({ statusCode: 403, message: 'Forbidden' })

  const body = await parseBody(event, UserSchema)
  const db = useDB(event)

  // Non-admin managers can only create delivery/viewer accounts
  if (!isAdmin && body.role === 'admin') {
    body.role = 'delivery'
  }

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, body.username)).get()
  if (existing) throw createError({ statusCode: 409, message: 'Username already taken' })

  const passwordHash = await hashPassword(body.password)
  const [created] = await db.insert(users).values({
    publicId: generateId(),
    username: body.username,
    fullName: body.fullName,
    role: body.role,
    passwordHash,
  }).returning({
    id: users.id,
    publicId: users.publicId,
    username: users.username,
    fullName: users.fullName,
    role: users.role,
    isActive: users.isActive,
    createdAt: users.createdAt,
  })
  if (!created) throw createError({ statusCode: 500, message: 'Failed to create user' })

  return { data: created }
})
