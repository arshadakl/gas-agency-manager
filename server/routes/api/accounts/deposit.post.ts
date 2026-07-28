import { z } from 'zod'
import { useDB } from '~/server/database'
import { recordAccountTransaction, getAccountBalance } from '~/server/utils/account'

const DepositSchema = z.object({
  amount: z.number().positive(),
  accountType: z.enum(['cash', 'bank']),
  notes: z.string().max(500).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery'])
  const body = await parseBody(event, DepositSchema)
  const db = useDB(event)

  const tx = await recordAccountTransaction(db, {
    accountType: body.accountType,
    amount: body.amount,
    transactionType: 'deposit',
    notes: body.notes ?? 'Deposit to account',
    user,
  })

  const balance = await getAccountBalance(db, body.accountType)

  return { data: { balance, transaction: tx } }
})
