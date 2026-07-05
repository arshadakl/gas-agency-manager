import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { purchases, purchaseItems, stockMovements } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])
  const db = useDB(event)

  await db.delete(stockMovements).where(eq(stockMovements.referenceType, 'purchase'))
  await db.delete(purchaseItems)
  await db.delete(purchases)

  return { data: { message: 'All purchase data cleared' } }
})
