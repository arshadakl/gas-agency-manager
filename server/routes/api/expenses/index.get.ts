import { eq, and, gte, lte, desc, sql, getTableColumns } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { expenses } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])

  const query = getQuery(event) as { tag?: string; from?: string; to?: string }
  const db = useDB(event)

  const conditions: ReturnType<typeof eq>[] = []

  if (query.tag) {
    conditions.push(eq(expenses.tag, query.tag as 'fuel' | 'maintenance' | 'free_accessory' | 'other'))
  }
  if (query.from) {
    conditions.push(gte(expenses.expenseDate, query.from))
  }
  if (query.to) {
    conditions.push(lte(expenses.expenseDate, query.to))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const rows = await db.select()
    .from(expenses)
    .where(where)
    .orderBy(desc(expenses.expenseDate), desc(expenses.id))
    .all()

  const total = rows.reduce((sum, r) => sum + r.amount, 0)

  const byTag = rows.reduce((acc, r) => {
    acc[r.tag] = (acc[r.tag] ?? 0) + r.amount
    return acc
  }, {} as Record<string, number>)

  const bySource = rows.reduce((acc, r) => {
    acc[r.paymentSource] = (acc[r.paymentSource] ?? 0) + r.amount
    return acc
  }, {} as Record<string, number>)

  return { data: rows, total, byTag, bySource }
})
