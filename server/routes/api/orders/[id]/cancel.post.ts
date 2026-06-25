import { eq, and } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { orders } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery'])

  const id = Number(getRouterParam(event, 'id'))
  const db = useDB(event)

  // Conditional update — only a pending order can be cancelled, and only once.
  const [cancelled] = await db.update(orders)
    .set({ status: 'cancelled' })
    .where(and(eq(orders.id, id), eq(orders.status, 'pending')))
    .returning()

  if (!cancelled) {
    const existing = await db.select({ status: orders.status }).from(orders).where(eq(orders.id, id)).get()
    if (!existing) throw createError({ statusCode: 404, message: 'Order not found' })
    throw createError({ statusCode: 409, message: `Order already ${existing.status}` })
  }

  return { data: cancelled }
})
