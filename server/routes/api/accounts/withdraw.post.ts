import { z } from 'zod'
import { useDB } from '~/server/database'
import { recordAccountTransaction, getAccountBalance } from '~/server/utils/account'

const WithdrawSchema = z.object({
  amount: z.number().positive(),
  accountType: z.enum(['cash', 'bank']),
  notes: z.string().max(500).optional(),
  salaryForName: z.string().max(100).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['admin', 'delivery'])
  const body = await parseBody(event, WithdrawSchema)
  const db = useDB(event)

  const tx = await recordAccountTransaction(db, {
    accountType: body.accountType,
    amount: -body.amount,
    transactionType: 'salary_withdrawal',
    notes: body.notes ?? 'Salary withdrawal',
    salaryForName: body.salaryForName,
    user,
  })

  const balance = await getAccountBalance(db, body.accountType)

  return { data: { balance, transaction: tx } }
})
