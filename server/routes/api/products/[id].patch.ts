import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDB } from '~/server/database'
import { products } from '~/server/database/schema'
import { ProductSchema } from '~/utils/validators'

const UpdateProductSchema = ProductSchema.partial().extend({
  isActive: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery'])

  const id = Number(getRouterParam(event, 'id'))
  const body = await parseBody(event, UpdateProductSchema)
  const db = useDB(event)

  const existing = await db.select().from(products).where(eq(products.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Product not found' })

  const { isActive, ...rest } = body
  const [updated] = await db.update(products)
    .set({
      ...(rest.name !== undefined ? { name: rest.name } : {}),
      ...(rest.type !== undefined ? { type: rest.type } : {}),
      ...(rest.cylinderSize !== undefined ? { cylinderSize: rest.cylinderSize } : {}),
      ...(rest.unit !== undefined ? { unit: rest.unit } : {}),
      ...(isActive !== undefined ? { isActive: Number(isActive) } : {}),
    })
    .where(eq(products.id, id))
    .returning()

  if (!updated) throw createError({ statusCode: 500, message: 'Failed to update product' })

  return { data: updated }
})
