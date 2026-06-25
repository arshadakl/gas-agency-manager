import { useDB } from '~/server/database'
import { customerPayments } from '~/server/database/schema'
import type { PaymentMode } from '~/types'

// Auto-creates a customer_payments row when a delivery is marked paid at
// creation/deliver time — keeps the existing ledger/outstanding balance
// calculations (which all sum customer_payments) correct without needing a
// parallel "pending amount" computation. See CLAUDE.md §30.
export async function recordDeliveryPayment(
  db: ReturnType<typeof useDB>,
  params: {
    customerId: number
    deliveryId: number
    amount: number
    paymentDate: string
    paymentMode: PaymentMode
    user: { id: number; fullName: string }
  },
) {
  await db.insert(customerPayments).values({
    customerId: params.customerId,
    deliveryId: params.deliveryId,
    amount: params.amount,
    paymentMode: params.paymentMode,
    paymentDate: params.paymentDate,
    notes: 'Collected at delivery',
    createdBy: params.user.id,
    createdByName: params.user.fullName,
  })
}
