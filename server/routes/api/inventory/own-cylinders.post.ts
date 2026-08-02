import { z } from 'zod'
import { sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { cylinderStock, stockMovements } from '~/server/database/schema'
import { CYLINDER_SIZES } from '~/types'
import type { AccountType } from '~/types'
import { recordAccountTransaction } from '~/server/utils/account'

const AddOwnCylindersSchema = z.object({
  sizeKg: z.number().refine((v) => CYLINDER_SIZES.includes(v as typeof CYLINDER_SIZES[number]), 'Invalid cylinder size'),
  count: z.number().int().min(1, 'Count must be at least 1'),
  amount: z.number().min(0, 'Amount cannot be negative'),
  debitFromAccount: z.boolean().default(false),
  paymentSource: z.enum(['cash', 'bank']).default('cash'),
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

  // Log the stock movement
  await db.insert(stockMovements).values({
    sizeKg: body.sizeKg,
    movementType: 'adjustment',
    fullChange: body.count,
    emptyChange: 0,
    notes: `Own cylinders added: ${body.count} pcs, cost ₹${body.amount.toLocaleString('en-IN')}${body.debitFromAccount ? ` (debited from ${body.paymentSource})` : ''}`,
    createdBy: user.id,
    createdByName: user.fullName,
  })

  // Optionally debit from account
  if (body.debitFromAccount && body.amount > 0) {
    await recordAccountTransaction(db, {
      accountType: body.paymentSource as AccountType,
      amount: -body.amount,
      transactionType: 'expense',
      notes: `Own cylinders: ${body.count} × ${body.sizeKg}kg`,
      user,
    })
  }

  return { data: { message: `${body.count} × ${body.sizeKg}kg own cylinders added` } }
})
