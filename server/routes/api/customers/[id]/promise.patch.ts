import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { customers } from '~/server/database/schema'
import { PaymentPromiseSchema } from '~/utils/validators'

// Set, edit, or clear (promisedPayDate: null) a customer's payment promise —
// "will pay outstanding on this date". Auto-cleared when balance hits zero
// (server/utils/payment.ts).
export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin', 'delivery'])

  const publicId = getRouterParam(event, 'id')!
  const body = await parseBody(event, PaymentPromiseSchema)
  const db = useDB(event)

  const existing = await db.select().from(customers).where(eq(customers.publicId, publicId)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Customer not found' })

  const [updated] = await db.update(customers)
    .set({
      promisedPayDate: body.promisedPayDate,
      // Clearing the date always clears the note too — a note without a date is meaningless.
      promisedPayNote: body.promisedPayDate === null ? null : (body.promisedPayNote ?? null),
    })
    .where(eq(customers.id, existing.id))
    .returning()

  if (!updated) throw createError({ statusCode: 500, message: 'Failed to update payment promise' })

  return { data: updated }
})
