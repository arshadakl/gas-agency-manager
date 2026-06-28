import { and, eq, gte, lte, desc } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { deliveries, orders, customerPayments } from '~/server/database/schema'
import { ReportQuerySchema } from '~/utils/validators'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])

  const userId = Number(getRouterParam(event, 'userId'))
  const { from, to } = parseQuery(event, ReportQuerySchema)
  const db = useDB(event)

  const [staffDeliveries, staffOrders, staffPayments] = await Promise.all([
    db.select().from(deliveries)
      .where(and(eq(deliveries.createdBy, userId), gte(deliveries.deliveryDate, from), lte(deliveries.deliveryDate, to)))
      .orderBy(desc(deliveries.deliveryDate))
      .all(),
    db.select().from(orders)
      .where(and(eq(orders.createdBy, userId), gte(orders.orderDate, from), lte(orders.orderDate, to)))
      .orderBy(desc(orders.orderDate))
      .all(),
    db.select().from(customerPayments)
      .where(and(eq(customerPayments.createdBy, userId), gte(customerPayments.paymentDate, from), lte(customerPayments.paymentDate, to)))
      .orderBy(desc(customerPayments.paymentDate))
      .all(),
  ])

  return { data: { deliveries: staffDeliveries, orders: staffOrders, payments: staffPayments } }
})
