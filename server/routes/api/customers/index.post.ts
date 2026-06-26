import { useDB } from '~/server/database'
import { customers } from '~/server/database/schema'
import { CustomerSchema } from '~/utils/validators'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])

  const body = await parseBody(event, CustomerSchema)
  const db = useDB(event)

  const [created] = await db.insert(customers).values(body).returning()
  if (!created) throw createError({ statusCode: 500, message: 'Failed to create customer' })

  return { data: created }
})
