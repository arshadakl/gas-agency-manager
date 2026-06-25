import { eq, and, desc, inArray } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { orders, orderItems, customers, products } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])

  const query = getQuery(event) as { status?: string }
  const db = useDB(event)

  const conditions = [
    query.status ? eq(orders.status, query.status as 'pending' | 'delivered' | 'cancelled') : undefined,
  ].filter((c) => c !== undefined)

  const rows = await db.select({
    order: orders,
    customer: {
      id: customers.id,
      name: customers.name,
      contactPerson: customers.contactPerson,
      area: customers.area,
    },
  })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(orders.orderDate))
    .all()

  const orderIds = rows.map((r) => r.order.id)
  const items = orderIds.length > 0
    ? await db.select({ item: orderItems, product: products })
      .from(orderItems)
      .innerJoin(products, eq(products.id, orderItems.productId))
      .where(inArray(orderItems.orderId, orderIds))
      .all()
    : []

  const itemsByOrderId = new Map<number, typeof items>()
  for (const row of items) {
    const list = itemsByOrderId.get(row.item.orderId) ?? []
    list.push(row)
    itemsByOrderId.set(row.item.orderId, list)
  }

  const data = rows.map((r) => ({
    ...r.order,
    customer: r.customer,
    items: (itemsByOrderId.get(r.order.id) ?? []).map((i) => ({ ...i.item, product: i.product })),
  }))

  return { data, total: data.length }
})
