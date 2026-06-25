import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { customers } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])

  const id = Number(getRouterParam(event, 'id'))
  const db = useDB(event)

  const customer = await db.select().from(customers).where(eq(customers.id, id)).get()
  if (!customer) throw createError({ statusCode: 404, message: 'Customer not found' })

  return { data: customer }
})
