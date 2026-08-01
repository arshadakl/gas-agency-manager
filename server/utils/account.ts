import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { accounts, accountTransactions } from '~/server/database/schema'
import type { AccountType, AccountTransactionType } from '~/types'

export async function getAccountBalance(db: ReturnType<typeof useDB>, type: AccountType) {
  const row = await db.select().from(accounts).where(eq(accounts.type, type)).get()
  return row?.balance ?? 0
}

export async function updateAccountBalance(
  db: ReturnType<typeof useDB>,
  type: AccountType,
  amountChange: number,
) {
  const current = await getAccountBalance(db, type)
  const newBalance = Math.round((current + amountChange) * 100) / 100

  if (newBalance < 0) {
    throw createError({
      statusCode: 422,
      message: `Insufficient ${type} balance. Available: ₹${current.toLocaleString('en-IN')}`,
    })
  }

  await db.update(accounts)
    .set({ balance: newBalance, updatedAt: new Date().toISOString() })
    .where(eq(accounts.type, type))
  return newBalance
}

export async function recordAccountTransaction(
  db: ReturnType<typeof useDB>,
  params: {
    accountType: AccountType
    amount: number
    transactionType: AccountTransactionType
    referenceId?: number
    referenceType?: string
    notes?: string
    user: { id: number; fullName: string }
  },
) {
  // Update balance: positive = in, negative = out
  await updateAccountBalance(db, params.accountType, params.amount)

  const [tx] = await db.insert(accountTransactions).values({
    accountType: params.accountType,
    amount: params.amount,
    transactionType: params.transactionType,
    referenceId: params.referenceId ?? null,
    referenceType: params.referenceType ?? null,
    notes: params.notes ?? null,
    createdBy: params.user.id,
    createdByName: params.user.fullName,
  }).returning()

  return tx
}

export async function reverseAccountTransaction(
  db: ReturnType<typeof useDB>,
  referenceType: string,
  referenceId: number,
  user: { id: number; fullName: string },
) {
  // Find ALL original transactions for this reference (split payments may have multiple).
  const existing = await db.select()
    .from(accountTransactions)
    .where(
      eq(accountTransactions.referenceType, referenceType) &&
      eq(accountTransactions.referenceId, referenceId),
    )
    .all()

  if (existing.length === 0) return

  // Reverse each one: flip the sign to restore the account balance.
  for (const tx of existing) {
    await recordAccountTransaction(db, {
      accountType: tx.accountType as AccountType,
      amount: -tx.amount,
      transactionType: 'adjustment',
      referenceId: tx.id,
      referenceType: 'reversal',
      notes: `Reversed: ${tx.transactionType}`,
      user,
    })
  }
}
