import type { H3Event } from 'h3'
import type { Role } from '~/types'

export async function requireUser(event: H3Event) {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Unauthorised' })
  return session.user
}

export async function requireRole(event: H3Event, roles: Role[]) {
  const user = await requireUser(event)
  if (!roles.includes(user.role)) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }
  return user
}
