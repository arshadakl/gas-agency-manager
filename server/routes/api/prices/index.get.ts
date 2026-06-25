import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { prices } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])

  const query = getQuery(event) as { productId?: string }
  const db = useDB(event)

  const rows = query.productId
    ? await db.select().from(prices).where(eq(prices.productId, Number(query.productId))).all()
    : await db.select().from(prices).all()

  return { data: rows, total: rows.length }
})
