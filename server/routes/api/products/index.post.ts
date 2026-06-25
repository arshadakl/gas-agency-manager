import { useDB } from '~/server/database'
import { products } from '~/server/database/schema'
import { ProductSchema } from '~/utils/validators'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])

  const body = await parseBody(event, ProductSchema)
  const db = useDB(event)

  const [created] = await db.insert(products).values(body).returning()

  return { data: created }
})
