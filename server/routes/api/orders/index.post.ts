import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { orders, orderItems, customers } from '~/server/database/schema'

const CreateOrderSchema = z.object({
  customerId: z.number().int().positive(),
  orderDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(z.object({
    productId: z.number().int().positive(),
    quantity: z.number().positive(),
  })).min(1),
  notes: z.string().max(500).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery'])

  const body = await parseBody(event, CreateOrderSchema)
  const db = useDB(event)

  const customer = await db.select({ id: customers.id }).from(customers).where(eq(customers.id, body.customerId)).get()
  if (!customer) throw createError({ statusCode: 404, message: 'Customer not found' })

  const [order] = await db.insert(orders).values({
    customerId: body.customerId,
    orderDate: body.orderDate,
    notes: body.notes,
    createdBy: user.id,
    createdByName: user.fullName,
  }).returning()

  if (!order) throw createError({ statusCode: 500, message: 'Failed to create order' })

  await db.insert(orderItems).values(
    body.items.map((i) => ({ orderId: order.id, productId: i.productId, quantity: i.quantity })),
  )

  return { data: { ...order, items: body.items } }
})
