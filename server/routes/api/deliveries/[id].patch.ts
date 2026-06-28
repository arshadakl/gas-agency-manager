import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { deliveries, deliveryItems } from '~/server/database/schema'
import { DeliverySchema } from '~/utils/validators'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery'])
  const publicId = getRouterParam(event, 'id')!

  const body = await parseBody(event, DeliverySchema)
  const db = useDB(event)

  const originalDelivery = await db.select()
    .from(deliveries)
    .where(eq(deliveries.publicId, publicId))
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
    .where(eq(deliveries.id, originalDelivery.id))

  await db.delete(deliveryItems)
    .where(eq(deliveryItems.deliveryId, originalDelivery.id))

  if (body.items.length > 0) {
    await db.insert(deliveryItems).values(
      body.items.map((item) => ({
        deliveryId: originalDelivery.id,
        productId: item.productId,
        quantity: item.quantity,
      }))
    )
  }

  return { data: { ...originalDelivery, totalAmount: body.totalAmount, items: body.items } }
})
