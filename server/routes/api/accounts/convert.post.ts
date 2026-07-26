import { z } from 'zod'
import { useDB } from '~/server/database'
import { recordAccountTransaction } from '~/server/utils/account'

const ConvertSchema = z.object({
  from: z.enum(['cash', 'bank']),
  amount: z.number().positive(),
  notes: z.string().max(500).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery'])
  const body = await parseBody(event, ConvertSchema)
  const db = useDB(event)

  const to = body.from === 'cash' ? 'bank' : 'cash'

  // Deduct from source
  await recordAccountTransaction(db, {
    accountType: body.from,
    amount: -body.amount,
    transactionType: 'conversion_out',
    notes: body.notes ?? `Convert ${body.from} → ${to}`,
    user,
  })

  // Add to destination
  await recordAccountTransaction(db, {
    accountType: to,
    amount: body.amount,
    transactionType: 'conversion_in',
    notes: body.notes ?? `Convert ${body.from} → ${to}`,
    user,
  })

  return { data: { from: body.from, to, amount: body.amount } }
})
