import { useDB } from '~/server/database'
import { customerPayments } from '~/server/database/schema'
import { PaymentSchema } from '~/utils/validators'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin'])

  const body = await parseBody(event, PaymentSchema)
  const db = useDB(event)

  const [created] = await db.insert(customerPayments).values({
    ...body,
    createdBy: user.id,
    createdByName: user.fullName,
  }).returning()

  return { data: created }
})
