import { eq, and, desc, sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { customers, deliveries, customerPayments } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])

  const id = Number(getRouterParam(event, 'id'))
  const db = useDB(event)

  const customer = await db.select().from(customers).where(eq(customers.id, id)).get()
  if (!customer) throw createError({ statusCode: 404, message: 'Customer not found' })

  const [totals, customerDeliveries, payments] = await Promise.all([
    db.select({
      totalBilled: sql<number>`coalesce(sum(${deliveries.totalAmount}), 0)`,
    })
      .from(deliveries)
      .where(and(eq(deliveries.customerId, id), eq(deliveries.status, 'delivered')))
      .get(),
    db.select().from(deliveries)
      .where(and(eq(deliveries.customerId, id), eq(deliveries.status, 'delivered')))
      .orderBy(desc(deliveries.deliveryDate))
      .all(),
    db.select().from(customerPayments)
      .where(eq(customerPayments.customerId, id))
      .orderBy(desc(customerPayments.paymentDate))
      .all(),
  ])

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  const totalBilled = totals?.totalBilled ?? 0
  const balance = Math.round((totalBilled - totalPaid) * 100) / 100

  return {
    data: {
      customer,
      totalBilled,
      totalPaid,
      balance,
      deliveries: customerDeliveries,
      payments,
    },
  }
})
