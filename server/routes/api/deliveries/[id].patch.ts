import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { deliveries, deliveryItems, products } from '~/server/database/schema'
import { DeliverySchema } from '~/utils/validators'
import type { CylinderSize } from '~/types'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery'])
  const deliveryId = parseInt(getRouterParam(event, 'id') || '0')

  if (!deliveryId) throw createError({ statusCode: 400, message: 'Invalid delivery ID' })

  const body = await parseBody(event, DeliverySchema)
  const db = useDB(event)

  // Get original delivery
  const originalDelivery = await db.select()
    .from(deliveries)
    .where(eq(deliveries.id, deliveryId))
    .get()

  if (!originalDelivery) throw createError({ statusCode: 404, message: 'Delivery not found' })

  // Calculate new totals
  const itemsWithPrice = await Promise.all(body.items.map(async (item) => {
    const unitPrice = await resolvePrice(event, item.productId, body.customerId, body.deliveryDate)
    const subtotal = Math.round(item.quantity * unitPrice * 100) / 100
    return { ...item, unitPrice, subtotal }
  }))

  const totalAmount = Math.round(itemsWithPrice.reduce((sum, i) => sum + i.subtotal, 0) * 100) / 100

  // Update delivery header
  await db.update(deliveries)
    .set({
      customerId: body.customerId,
      deliveryDate: body.deliveryDate,
      paymentStatus: body.paymentStatus,
      totalAmount,
      notes: body.notes,
    })
    .where(eq(deliveries.id, deliveryId))

  // Delete old items
  await db.delete(deliveryItems)
    .where(eq(deliveryItems.deliveryId, deliveryId))

  // Insert new items
  if (itemsWithPrice.length > 0) {
    await db.insert(deliveryItems).values(
      itemsWithPrice.map((item) => ({
        deliveryId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      }))
    )
  }

  return { data: { ...originalDelivery, items: itemsWithPrice } }
})
