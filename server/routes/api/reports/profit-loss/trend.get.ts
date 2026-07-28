import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { deliveries, purchases, expenses } from '~/server/database/schema'

interface TrendMonth {
  month: string
  revenue: number
  costs: number
  expenses: number
  profit: number
}

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])

  const query = getQuery(event) as { months?: string }
  const months = Math.min(Math.max(parseInt(query.months ?? '6') || 6, 2), 24)
  const db = useDB(event)

  // Build month list (most recent N months)
  const monthList: string[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthList.push(ym)
  }

  const firstMonth = monthList[0]!
  const lastMonth = monthList[monthList.length - 1]!
  const from = `${firstMonth}-01`
  const to = `${lastMonth}-31`

  const [revenueRows, costRows, expenseRows] = await Promise.all([
    // Revenue per month
    db.select({
      month: sql<string>`substr(${deliveries.deliveryDate}, 1, 7)`,
      total: sql<number>`coalesce(sum(${deliveries.totalAmount}), 0)`,
    })
      .from(deliveries)
      .where(and(
        eq(deliveries.status, 'delivered'),
        gte(deliveries.deliveryDate, from),
        lte(deliveries.deliveryDate, to),
      ))
      .groupBy(sql`substr(${deliveries.deliveryDate}, 1, 7)`)
      .all(),

    // Costs per month
    db.select({
      month: sql<string>`substr(${purchases.purchaseDate}, 1, 7)`,
      total: sql<number>`coalesce(sum(${purchases.totalAmount} + ${purchases.connectionCharge}), 0)`,
    })
      .from(purchases)
      .where(and(gte(purchases.purchaseDate, from), lte(purchases.purchaseDate, to)))
      .groupBy(sql`substr(${purchases.purchaseDate}, 1, 7)`)
      .all(),

    // Expenses per month
    db.select({
      month: sql<string>`substr(${expenses.expenseDate}, 1, 7)`,
      total: sql<number>`coalesce(sum(${expenses.amount}), 0)`,
    })
      .from(expenses)
      .where(and(gte(expenses.expenseDate, from), lte(expenses.expenseDate, to)))
      .groupBy(sql`substr(${expenses.expenseDate}, 1, 7)`)
      .all(),
  ])

  const revenueMap = new Map(revenueRows.map(r => [r.month, r.total]))
  const costMap = new Map(costRows.map(r => [r.month, r.total]))
  const expenseMap = new Map(expenseRows.map(r => [r.month, r.total]))

  const data: TrendMonth[] = monthList.map(month => {
    const revenue = revenueMap.get(month) ?? 0
    const costs = costMap.get(month) ?? 0
    const expenses = expenseMap.get(month) ?? 0
    return { month, revenue, costs, expenses, profit: revenue - costs - expenses }
  })

  return { data }
})
