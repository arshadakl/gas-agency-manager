import { useDB } from '~/server/database'
import { customerPayments } from '~/server/database/schema'
import { PaymentSchema } from '~/utils/validators'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery'])

  const body = await parseBody(event, PaymentSchema)
  const db = useDB(event)

  const [created] = await db.insert(customerPayments).values({
    ...body,
    createdBy: user.id,
    createdByName: user.fullName,
  }).returning()
  if (!created) throw createError({ statusCode: 500, message: 'Failed to record payment' })

  return { data: created }
})
