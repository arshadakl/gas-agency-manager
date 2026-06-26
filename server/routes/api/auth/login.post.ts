import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { users } from '~/server/database/schema'
import { verifyPassword } from '~/server/utils/password'

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const body = await parseBody(event, LoginSchema)

  const db = useDB(event)
  const user = await db.select()
    .from(users)
    .where(eq(users.username, body.username))
    .get()

  if (!user || !user.isActive) {
    throw createError({ statusCode: 401, message: 'Invalid username or password' })
  }

  const valid = await verifyPassword(body.password, user.passwordHash)
  if (!valid) {
    throw createError({ statusCode: 401, message: 'Invalid username or password' })
  }

  await setUserSession(event, {
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    },
  })

  return { data: { id: user.id, username: user.username, fullName: user.fullName, role: user.role } }
})
