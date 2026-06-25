import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { orders, orderItems, customers, products } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])

  const id = Number(getRouterParam(event, 'id'))
  const db = useDB(event)

  const order = await db.select().from(orders).where(eq(orders.id, id)).get()
  if (!order) throw createError({ statusCode: 404, message: 'Order not found' })

  const customer = await db.select().from(customers).where(eq(customers.id, order.customerId)).get()
  if (!customer) throw createError({ statusCode: 500, message: 'Order customer missing' })

  const items = await db.select({ item: orderItems, product: products })
    .from(orderItems)
    .innerJoin(products, eq(products.id, orderItems.productId))
    .where(eq(orderItems.orderId, id))
    .all()

  return {
    data: {
      ...order,
      customer: { id: customer.id, name: customer.name, contactPerson: customer.contactPerson, area: customer.area },
      items: items.map((i) => ({ ...i.item, product: i.product })),
    },
  }
})
