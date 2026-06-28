import { eq, and, gte, lte, desc, inArray } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { customerPayments, customers, deliveryItems, products } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery', 'viewer'])

  const query = getQuery(event) as { customerId?: string; from?: string; to?: string; paymentMode?: string }
  const db = useDB(event)

  const conditions = [
    query.customerId ? eq(customerPayments.customerId, Number(query.customerId)) : undefined,
    query.from ? gte(customerPayments.paymentDate, query.from) : undefined,
    query.to ? lte(customerPayments.paymentDate, query.to) : undefined,
    query.paymentMode ? eq(customerPayments.paymentMode, query.paymentMode as 'cash' | 'upi' | 'bank' | 'cheque') : undefined,
  ].filter((c) => c !== undefined)

  const rows = await db.select({
    payment: customerPayments,
    customerName: customers.name,
  })
    .from(customerPayments)
    .innerJoin(customers, eq(customers.id, customerPayments.customerId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(customerPayments.paymentDate))
    .all()

  const deliveryIds = rows.map((r) => r.payment.deliveryId).filter((id): id is number => id !== null)
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

  const data = rows.map((r) => ({
    ...r.payment,
    customerName: r.customerName,
    items: r.payment.deliveryId
      ? (itemsByDeliveryId.get(r.payment.deliveryId) ?? []).map((i) => ({ ...i.item, product: i.product }))
      : [],
  }))

  return { data, total: data.length }
})
