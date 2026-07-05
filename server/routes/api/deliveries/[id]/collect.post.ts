import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { deliveries } from '~/server/database/schema'
import { CollectPaymentSchema } from '~/utils/validators'
import { recordCustomerPayment } from '~/server/utils/payment'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery'])
  const publicId = getRouterParam(event, 'id')!

  const body = await parseBody(event, CollectPaymentSchema)
  const db = useDB(event)

  const delivery = await db.select().from(deliveries).where(eq(deliveries.publicId, publicId)).get()
  if (!delivery) throw createError({ statusCode: 404, message: 'Delivery not found' })
  if (delivery.paymentStatus === 'paid') throw createError({ statusCode: 409, message: 'Delivery is already fully paid' })

  const today = new Date().toISOString().split('T')[0]!

  await recordCustomerPayment(db, {
    customerId: delivery.customerId,
    deliveryId: delivery.id,
    amount: body.amount,
    paymentDate: today,
    paymentMode: body.paymentMode,
    notes: 'Collected at delivery',
    target: { type: 'delivery', deliveryId: delivery.id },
    user,
  })

  const updated = await db.select().from(deliveries).where(eq(deliveries.id, delivery.id)).get()
  return { data: updated }
})
