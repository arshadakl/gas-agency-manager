import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDB } from '~/server/database'
import { customers } from '~/server/database/schema'
import { CustomerSchema } from '~/utils/validators'

const UpdateCustomerSchema = CustomerSchema.partial().extend({
  isActive: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])

  const id = Number(getRouterParam(event, 'id'))
  const body = await parseBody(event, UpdateCustomerSchema)
  const db = useDB(event)

  const existing = await db.select().from(customers).where(eq(customers.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Customer not found' })

  const { isActive, ...rest } = body
  const [updated] = await db.update(customers)
    .set({
      ...(rest.name !== undefined ? { name: rest.name } : {}),
      ...(rest.contactPerson !== undefined ? { contactPerson: rest.contactPerson } : {}),
      ...(rest.area !== undefined ? { area: rest.area } : {}),
      ...(rest.phone !== undefined ? { phone: rest.phone } : {}),
      ...(rest.whatsappNumber !== undefined ? { whatsappNumber: rest.whatsappNumber } : {}),
      ...(rest.address !== undefined ? { address: rest.address } : {}),
      ...(isActive !== undefined ? { isActive: Number(isActive) } : {}),
    })
    .where(eq(customers.id, id))
    .returning()

  if (!updated) throw createError({ statusCode: 500, message: 'Failed to update customer' })

  return { data: updated }
})
