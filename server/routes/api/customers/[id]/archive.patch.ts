import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { customers } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])

  const publicId = getRouterParam(event, 'id')!
  const db = useDB(event)

  const existing = await db.select().from(customers).where(eq(customers.publicId, publicId)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Customer not found' })

  const [updated] = await db.update(customers)
    .set({ isActive: 0 })
    .where(eq(customers.id, existing.id))
    .returning()

  if (!updated) throw createError({ statusCode: 500, message: 'Failed to archive customer' })

  return { data: updated }
})
