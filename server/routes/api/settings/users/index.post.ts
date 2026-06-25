import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { users } from '~/server/database/schema'
import { UserSchema } from '~/utils/validators'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])

  const body = await parseBody(event, UserSchema)
  const db = useDB(event)

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, body.username)).get()
  if (existing) throw createError({ statusCode: 409, message: 'Username already taken' })

  const passwordHash = await hashPassword(body.password)
  const [created] = await db.insert(users).values({
    username: body.username,
    fullName: body.fullName,
    role: body.role,
    passwordHash,
  }).returning({
    id: users.id,
    username: users.username,
    fullName: users.fullName,
    role: users.role,
    isActive: users.isActive,
    createdAt: users.createdAt,
  })

  return { data: created }
})
