import { and, eq, gte, lte, desc } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { deliveries, orders, customerPayments, customers } from '~/server/database/schema'
import { ReportQuerySchema } from '~/utils/validators'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])

  const rawUserId = getRouterParam(event, 'userId')
  const userId = rawUserId ? Number(rawUserId) : NaN
  if (!Number.isFinite(userId) || userId <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid user ID' })
  }
  const { from, to } = parseQuery(event, ReportQuerySchema)
  const db = useDB(event)

  const [staffDeliveries, staffOrders, staffPayments] = await Promise.all([
    db.select({
      id: deliveries.id,
      customerId: deliveries.customerId,
      customerName: customers.name,
      deliveryDate: deliveries.deliveryDate,
      totalAmount: deliveries.totalAmount,
      status: deliveries.status,
      paymentStatus: deliveries.paymentStatus,
      notes: deliveries.notes,
    })
      .from(deliveries)
      .innerJoin(customers, eq(customers.id, deliveries.customerId))
      .where(and(eq(deliveries.createdBy, userId), gte(deliveries.deliveryDate, from), lte(deliveries.deliveryDate, to)))
      .orderBy(desc(deliveries.deliveryDate))
      .all(),
    db.select().from(orders)
      .where(and(eq(orders.createdBy, userId), gte(orders.orderDate, from), lte(orders.orderDate, to)))
      .orderBy(desc(orders.orderDate))
      .all(),
    db.select({
      id: customerPayments.id,
      customerId: customerPayments.customerId,
      customerName: customers.name,
      amount: customerPayments.amount,
      paymentMode: customerPayments.paymentMode,
      paymentDate: customerPayments.paymentDate,
      notes: customerPayments.notes,
    })
      .from(customerPayments)
      .innerJoin(customers, eq(customers.id, customerPayments.customerId))
      .where(and(eq(customerPayments.createdBy, userId), gte(customerPayments.paymentDate, from), lte(customerPayments.paymentDate, to)))
      .orderBy(desc(customerPayments.paymentDate))
      .all(),
  ])

  return { data: { deliveries: staffDeliveries, orders: staffOrders, payments: staffPayments } }
})
