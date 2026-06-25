import { useDB } from '~/server/database'
import { prices } from '~/server/database/schema'
import { PriceSchema } from '~/utils/validators'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])

  const body = await parseBody(event, PriceSchema)
  const db = useDB(event)

  const [created] = await db.insert(prices).values(body).returning()

  return { data: created }
})
