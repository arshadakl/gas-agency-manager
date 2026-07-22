import { eq, and } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { orders } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery'])

  const publicId = getRouterParam(event, 'id')!
  const db = useDB(event)

  const order = await db.select().from(orders).where(eq(orders.publicId, publicId)).get()
  if (!order) throw createError({ statusCode: 404, message: 'Order not found' })

  const [cancelled] = await db.update(orders)
    .set({ status: 'cancelled' })
    .where(and(eq(orders.id, order.id), eq(orders.status, 'pending')))
    .returning()

  if (!cancelled) {
    throw createError({ statusCode: 409, message: `Order already ${order.status}` })
  }

  return { data: cancelled }
})
