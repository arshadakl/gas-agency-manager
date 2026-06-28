import { useDB } from '~/server/database'
import { cylinderStock, stockMovements } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])
  const db = useDB(event)

  await db.delete(stockMovements)
  await db.update(cylinderStock).set({ fullCount: 0, emptyCount: 0 })

  return { data: { message: 'All stock data cleared' } }
})
