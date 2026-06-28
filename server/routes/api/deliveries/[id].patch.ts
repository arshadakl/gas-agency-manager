import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { deliveries, deliveryItems } from '~/server/database/schema'
import { DeliverySchema } from '~/utils/validators'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery'])
  const deliveryId = parseInt(getRouterParam(event, 'id') || '0')

  if (!deliveryId) throw createError({ statusCode: 400, message: 'Invalid delivery ID' })

  const body = await parseBody(event, DeliverySchema)
  const db = useDB(event)

  const originalDelivery = await db.select()
    .from(deliveries)
    .where(eq(deliveries.id, deliveryId))
    .get()

  if (!originalDelivery) throw createError({ statusCode: 404, message: 'Delivery not found' })

  await db.update(deliveries)
    .set({
      customerId: body.customerId,
      deliveryDate: body.deliveryDate,
      paymentStatus: body.paymentStatus,
      totalAmount: body.totalAmount,
      notes: body.notes,
    })
    .where(eq(deliveries.id, deliveryId))

  await db.delete(deliveryItems)
    .where(eq(deliveryItems.deliveryId, deliveryId))

  if (body.items.length > 0) {
    await db.insert(deliveryItems).values(
      body.items.map((item) => ({
        deliveryId,
        productId: item.productId,
        quantity: item.quantity,
      }))
    )
  }

  return { data: { ...originalDelivery, totalAmount: body.totalAmount, items: body.items } }
})
