import { z } from 'zod'
import { sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { cylinderStock, stockMovements } from '~/server/database/schema'
import { CYLINDER_SIZES } from '~/types'

const AddOwnCylindersSchema = z.object({
  sizeKg: z.number().refine((v) => CYLINDER_SIZES.includes(v as typeof CYLINDER_SIZES[number]), 'Invalid cylinder size'),
  count: z.number().int().min(1, 'Count must be at least 1'),
  amount: z.number().min(0, 'Amount cannot be negative'),
})

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery'])
  const body = await parseBody(event, AddOwnCylindersSchema)
  const db = useDB(event)

  // Increment ownCount atomically
  await db.update(cylinderStock)
    .set({
      ownCount: sql`${cylinderStock.ownCount} + ${body.count}`,
      updatedAt: new Date().toISOString(),
    })
    .where(sql`${cylinderStock.sizeKg} = ${body.sizeKg}`)

  // Log the stock movement (fullChange = count, emptyChange = 0, notes = cost)
  await db.insert(stockMovements).values({
    sizeKg: body.sizeKg,
    movementType: 'adjustment',
    fullChange: body.count,
    emptyChange: 0,
    notes: `Own cylinders added: ${body.count} pcs, cost ₹${body.amount.toLocaleString('en-IN')}`,
    createdBy: user.id,
    createdByName: user.fullName,
  })

  return { data: { message: `${body.count} × ${body.sizeKg}kg own cylinders added` } }
})
