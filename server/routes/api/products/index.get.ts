import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { products } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])

  const db = useDB(event)
  const rows = await db.select().from(products).where(eq(products.isActive, 1)).all()

  return { data: rows, total: rows.length }
})
