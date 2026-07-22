import { useDB } from '~/server/database'
import { products } from '~/server/database/schema'
import { ProductSchema } from '~/utils/validators'
import { generateId } from '~/server/utils/id'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery'])

  const body = await parseBody(event, ProductSchema)
  const db = useDB(event)

  const [created] = await db.insert(products).values({
    publicId: generateId(),
    name: body.name,
    type: body.type,
    cylinderSize: body.cylinderSize ?? null,
    unit: body.unit,
  }).returning()
  if (!created) throw createError({ statusCode: 500, message: 'Failed to create product' })

  return { data: created }
})
