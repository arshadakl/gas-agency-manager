import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { deliveries, customerPayments, purchases, expenses, accountTransactions } from '~/server/database/schema'
import { ReportQuerySchema } from '~/utils/validators'

async function fetchPnl(db: ReturnType<typeof useDB>, from: string, to: string) {
  const [revenue, collections, purchaseCosts, expenseData, withdrawals] = await Promise.all([
    // Revenue: sum of delivered totalAmount
    db.select({ total: sql<number>`coalesce(sum(${deliveries.totalAmount}), 0)` })
      .from(deliveries)
      .where(and(eq(deliveries.status, 'delivered'), gte(deliveries.deliveryDate, from), lte(deliveries.deliveryDate, to)))
      .get(),

    // Collections by mode
    db.select({
      mode: customerPayments.paymentMode,
      total: sql<number>`coalesce(sum(${customerPayments.amount}), 0)`,
    })
      .from(customerPayments)
      .where(and(gte(customerPayments.paymentDate, from), lte(customerPayments.paymentDate, to)))
      .groupBy(customerPayments.paymentMode)
      .all(),

    // Purchase costs
    db.select({
      totalAmount: sql<number>`coalesce(sum(${purchases.totalAmount}), 0)`,
      connectionCharge: sql<number>`coalesce(sum(${purchases.connectionCharge}), 0)`,
    })
      .from(purchases)
      .where(and(gte(purchases.purchaseDate, from), lte(purchases.purchaseDate, to)))
      .get(),

    // Expenses by tag
    db.select({
      tag: expenses.tag,
      total: sql<number>`coalesce(sum(${expenses.amount}), 0)`,
    })
      .from(expenses)
      .where(and(gte(expenses.expenseDate, from), lte(expenses.expenseDate, to)))
      .groupBy(expenses.tag)
      .all(),

    // Salary withdrawals
    db.select({
      total: sql<number>`coalesce(sum(abs(${accountTransactions.amount})), 0)`,
      count: sql<number>`count(*)`,
    })
      .from(accountTransactions)
      .where(and(
        eq(accountTransactions.transactionType, 'salary_withdrawal'),
        gte(accountTransactions.createdAt, from),
        lte(sql`date(${accountTransactions.createdAt})`, to),
      ))
      .get(),
  ])

  const totalBilled = revenue?.total ?? 0
  const cashCollected = collections.find(c => c.mode === 'cash')?.total ?? 0
  const bankCollected = collections.find(c => c.mode === 'bank')?.total ?? 0
  const totalCollected = cashCollected + bankCollected

  const gasPurchases = purchaseCosts?.totalAmount ?? 0
  const connectionCharges = purchaseCosts?.connectionCharge ?? 0
  const totalPurchases = gasPurchases + connectionCharges

  const expensesByTag: Record<string, number> = { fuel: 0, maintenance: 0, fine: 0, other: 0 }
  for (const row of expenseData) {
    expensesByTag[row.tag ?? 'other'] = row.total
  }
  const totalExpenses = Object.values(expensesByTag).reduce((a, b) => a + b, 0)

  const totalWithdrawals = withdrawals?.total ?? 0
  const withdrawalCount = withdrawals?.count ?? 0

  const grossProfit = totalBilled - totalPurchases
  const netProfit = grossProfit - totalExpenses

  return {
    revenue: { totalBilled, cashCollected, bankCollected, totalCollected },
    costs: { gasPurchases, connectionCharges, totalPurchases },
    expenses: { ...expensesByTag, total: totalExpenses },
    withdrawals: { total: totalWithdrawals, count: withdrawalCount },
    grossProfit,
    netProfit,
  }
}

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])

  const { from, to } = parseQuery(event, ReportQuerySchema)
  const db = useDB(event)

  const prevRange = getPreviousPeriod(from, to)
  const [current, previous] = await Promise.all([
    fetchPnl(db, from, to),
    fetchPnl(db, prevRange.from, prevRange.to),
  ])

  return {
    data: {
      ...current,
      previous: {
        grossProfit: previous.grossProfit,
        netProfit: previous.netProfit,
        grossDelta: getDelta(current.grossProfit, previous.grossProfit),
        netDelta: getDelta(current.netProfit, previous.netProfit),
      },
    },
  }
})
