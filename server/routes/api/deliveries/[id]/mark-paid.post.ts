import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDB } from '~/server/database'
import { deliveries } from '~/server/database/schema'
import { recordDeliveryPayment } from '~/server/utils/payment'

const MarkPaidSchema = z.object({
  paymentMode: z.enum(['cash', 'upi', 'bank', 'cheque']),
})

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery'])
  const deliveryId = parseInt(getRouterParam(event, 'id') || '0')
  if (!deliveryId) throw createError({ statusCode: 400, message: 'Invalid delivery ID' })

  const body = await parseBody(event, MarkPaidSchema)
  const db = useDB(event)

  const delivery = await db.select().from(deliveries).where(eq(deliveries.id, deliveryId)).get()
  if (!delivery) throw createError({ statusCode: 404, message: 'Delivery not found' })
  if (delivery.paymentStatus === 'paid') throw createError({ statusCode: 409, message: 'Delivery is already marked as paid' })

  const today = new Date().toISOString().split('T')[0]!

  await db.update(deliveries)
    .set({ paymentStatus: 'paid' })
    .where(eq(deliveries.id, deliveryId))

  await recordDeliveryPayment(db, {
    customerId: delivery.customerId,
    deliveryId: delivery.id,
    amount: delivery.totalAmount,
    paymentDate: today,
    paymentMode: body.paymentMode,
    user,
  })

  return { data: { ...delivery, paymentStatus: 'paid' } }
})
