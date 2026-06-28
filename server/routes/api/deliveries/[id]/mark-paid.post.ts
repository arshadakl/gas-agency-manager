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
  const publicId = getRouterParam(event, 'id')!

  const body = await parseBody(event, MarkPaidSchema)
  const db = useDB(event)

  const delivery = await db.select().from(deliveries).where(eq(deliveries.publicId, publicId)).get()
  if (!delivery) throw createError({ statusCode: 404, message: 'Delivery not found' })
  if (delivery.paymentStatus === 'paid') throw createError({ statusCode: 409, message: 'Delivery is already marked as paid' })

  const today = new Date().toISOString().split('T')[0]!

  await db.update(deliveries)
    .set({ paymentStatus: 'paid' })
    .where(eq(deliveries.id, delivery.id))

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
