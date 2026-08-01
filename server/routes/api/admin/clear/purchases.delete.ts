import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { purchases, purchaseItems, stockMovements, cylinderStock } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])
  const db = useDB(event)

  await db.delete(stockMovements).where(eq(stockMovements.referenceType, 'purchase'))
  await db.delete(purchaseItems)
  await db.delete(purchases)

  // Reset cylinder stock — movements are gone, stock must be zeroed
  await db.update(cylinderStock).set({ fullCount: 0, emptyCount: 0 })

  return { data: { message: 'All purchase data cleared' } }
})
