import { useDB } from '~/server/database'
import { PaymentSchema } from '~/utils/validators'
import { recordCustomerPayment } from '~/server/utils/payment'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery'])

  const body = await parseBody(event, PaymentSchema)
  const db = useDB(event)

  const created = await recordCustomerPayment(db, {
    customerId: body.customerId,
    amount: body.amount,
    paymentMode: body.paymentMode,
    paymentDate: body.paymentDate,
    notes: body.notes,
    target: { type: 'fifo' },
    user,
  })
  if (!created) throw createError({ statusCode: 500, message: 'Failed to record payment' })

  return { data: created }
})
