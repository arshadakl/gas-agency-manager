import { eq, and, desc, sql, inArray } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { customers, deliveries, deliveryItems, customerPayments, products } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])

  const publicId = getRouterParam(event, 'id')!
  const db = useDB(event)

  const customer = await db.select().from(customers).where(eq(customers.publicId, publicId)).get()
  if (!customer) throw createError({ statusCode: 404, message: 'Customer not found' })

  const id = customer.id

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

  const deliveryIds = customerDeliveries.map((d) => d.id)
  const items = deliveryIds.length > 0
    ? await db.select({ item: deliveryItems, product: products })
      .from(deliveryItems)
      .innerJoin(products, eq(products.id, deliveryItems.productId))
      .where(inArray(deliveryItems.deliveryId, deliveryIds))
      .all()
    : []

  const itemsByDeliveryId = new Map<number, typeof items>()
  for (const row of items) {
    const list = itemsByDeliveryId.get(row.item.deliveryId) ?? []
    list.push(row)
    itemsByDeliveryId.set(row.item.deliveryId, list)
  }

  const deliveriesWithItems = customerDeliveries.map((d) => ({
    ...d,
    items: (itemsByDeliveryId.get(d.id) ?? []).map((i) => ({ ...i.item, product: i.product })),
  }))

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  const totalBilled = totals?.totalBilled ?? 0
  const openingBalance = customer.openingBalance ?? 0
  const balance = Math.round((openingBalance + totalBilled - totalPaid) * 100) / 100

  return {
    data: {
      customer,
      openingBalance,
      totalBilled,
      totalPaid,
      balance,
      deliveries: deliveriesWithItems,
      payments,
    },
  }
})
