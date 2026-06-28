import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDB } from '~/server/database'
import { customers } from '~/server/database/schema'

const Schema = z.object({
  openingBalance: z.number().min(0),
})

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery'])

  const publicId = getRouterParam(event, 'id')!
  const body = await parseBody(event, Schema)
  const db = useDB(event)

  const existing = await db.select({ id: customers.id }).from(customers).where(eq(customers.publicId, publicId)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Customer not found' })

  const [updated] = await db.update(customers)
    .set({ openingBalance: body.openingBalance })
    .where(eq(customers.id, existing.id))
    .returning()

  return { data: updated }
})
