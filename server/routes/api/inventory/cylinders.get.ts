import { useDB } from '~/server/database'
import { cylinderStock } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])

  const db = useDB(event)
  const rows = await db.select().from(cylinderStock).orderBy(cylinderStock.sizeKg).all()

  return { data: rows, total: rows.length }
})
