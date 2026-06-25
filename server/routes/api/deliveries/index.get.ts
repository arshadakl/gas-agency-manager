import { eq, and, gte, lte, desc, inArray } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { deliveries, deliveryItems, customers, products } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery', 'viewer'])

  const query = getQuery(event) as { from?: string; to?: string; mine?: string }
  const db = useDB(event)

  // "mine" is a UI convenience filter, not a security gate — all staff
  // can see all deliveries (CLAUDE.md §21.1). Never scope by role here.
  const conditions = [
    query.mine === 'true' ? eq(deliveries.createdBy, user.id) : undefined,
    query.from ? gte(deliveries.deliveryDate, query.from) : undefined,
    query.to ? lte(deliveries.deliveryDate, query.to) : undefined,
  ].filter((c) => c !== undefined)

  // Always JOIN customer for the 3-level identity card pattern (CLAUDE.md §22.4)
  const rows = await db.select({
    delivery: deliveries,
    customer: {
      id: customers.id,
      name: customers.name,
      contactPerson: customers.contactPerson,
      area: customers.area,
    },
  })
    .from(deliveries)
    .innerJoin(customers, eq(customers.id, deliveries.customerId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(deliveries.deliveryDate))
    .all()

  const deliveryIds = rows.map((r) => r.delivery.id)
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
    ...r.delivery,
    customer: r.customer,
    items: (itemsByDeliveryId.get(r.delivery.id) ?? []).map((i) => ({ ...i.item, product: i.product })),
  }))

  return { data, total: data.length }
})
