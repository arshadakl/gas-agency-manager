import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { users } from '~/server/database/schema'
import type { FeatureKey } from '~/types'

export default defineEventHandler(async (event) => {
  const sessionUser = await requireUser(event)

  const db = useDB(event)
  const dbUser = await db.select({
    featuresDisabled: users.featuresDisabled,
  }).from(users).where(eq(users.id, sessionUser.id)).get()

  const freshFeatures: FeatureKey[] = dbUser?.featuresDisabled ? JSON.parse(dbUser.featuresDisabled) : []

  // Refresh session with latest featuresDisabled from DB
  if (JSON.stringify(freshFeatures) !== JSON.stringify(sessionUser.featuresDisabled ?? [])) {
    await setUserSession(event, {
      user: { ...sessionUser, featuresDisabled: freshFeatures },
    })
  }

  return { data: { ...sessionUser, featuresDisabled: freshFeatures } }
})
