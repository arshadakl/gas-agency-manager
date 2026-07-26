import { eq, and, asc, sql } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { customerPayments, customers, deliveries } from '~/server/database/schema'
import type { PaymentMode, DeliveryPaymentStatus, AccountType } from '~/types'
import { recordAccountTransaction } from '~/server/utils/account'

export function deriveStatus(amountCollected: number, totalAmount: number): DeliveryPaymentStatus {
  if (amountCollected <= 0) return 'pending'
  if (amountCollected >= totalAmount) return 'paid'
  return 'partial'
}

// Applies `amount` oldest-delivery-first across a customer's not-fully-paid
// delivered deliveries. Sequential read-then-write per row — D1 has no
// transactions (CLAUDE.md §23.4). Leftover after every delivery is settled is
// just credit, already reflected by the overall ledger balance going negative.
export async function allocatePaymentFifo(db: ReturnType<typeof useDB>, customerId: number, amount: number) {
  if (amount <= 0) return

  const candidates = await db.select()
    .from(deliveries)
    .where(and(eq(deliveries.customerId, customerId), eq(deliveries.status, 'delivered')))
    .orderBy(asc(deliveries.deliveryDate), asc(deliveries.id))
    .all()

  let remaining = amount
  for (const delivery of candidates) {
    if (remaining <= 0) break
    const due = delivery.totalAmount - delivery.amountCollected
    if (due <= 0) continue

    const applied = Math.min(due, remaining)
    const newAmountCollected = Math.round((delivery.amountCollected + applied) * 100) / 100
    await db.update(deliveries)
      .set({ amountCollected: newAmountCollected, paymentStatus: deriveStatus(newAmountCollected, delivery.totalAmount) })
      .where(eq(deliveries.id, delivery.id))
    remaining -= applied
  }
}

// Applies `amount` to exactly one delivery, capped at its remaining due.
// Throws 422 before any write if the amount exceeds what it still owes — the
// caller must not have inserted a customer_payments row yet at that point.
export async function allocatePaymentToDelivery(db: ReturnType<typeof useDB>, deliveryId: number, amount: number) {
  if (amount <= 0) return

  const delivery = await db.select().from(deliveries).where(eq(deliveries.id, deliveryId)).get()
  if (!delivery) throw createError({ statusCode: 404, message: 'Delivery not found' })

  const due = Math.round((delivery.totalAmount - delivery.amountCollected) * 100) / 100
  if (amount > due + 0.01) {
    throw createError({ statusCode: 422, message: `Amount exceeds the remaining due of ₹${due.toFixed(2)} for this delivery` })
  }

  const newAmountCollected = Math.round((delivery.amountCollected + amount) * 100) / 100
  await db.update(deliveries)
    .set({ amountCollected: newAmountCollected, paymentStatus: deriveStatus(newAmountCollected, delivery.totalAmount) })
    .where(eq(deliveries.id, delivery.id))
}

// Single entry point for recording money received from a customer. Inserts the
// customer_payments row (still the ledger's only source of truth, CLAUDE.md
// §30.2) and allocates it against deliveries per `target`:
//   - 'fifo'     — oldest unpaid delivery first (delivery/order creation-time
//                  collection, general settle-up payments)
//   - 'delivery' — capped to exactly one delivery (per-delivery Collect Payment
//                  action) — validated/written before the payment row exists
//                  so a rejected amount never leaves an orphaned payment.
export async function recordCustomerPayment(
  db: ReturnType<typeof useDB>,
  params: {
    customerId: number
    amount: number
    paymentMode: PaymentMode
    paymentDate: string
    notes?: string
    deliveryId?: number
    target: { type: 'fifo' } | { type: 'delivery'; deliveryId: number }
    user: { id: number; fullName: string }
  },
) {
  if (params.target.type === 'delivery') {
    await allocatePaymentToDelivery(db, params.target.deliveryId, params.amount)
  }

  if (params.amount <= 0) return null

  const [payment] = await db.insert(customerPayments).values({
    customerId: params.customerId,
    deliveryId: params.deliveryId,
    amount: params.amount,
    paymentMode: params.paymentMode,
    paymentDate: params.paymentDate,
    notes: params.notes,
    createdBy: params.user.id,
    createdByName: params.user.fullName,
  }).returning()

  if (params.target.type === 'fifo') {
    await allocatePaymentFifo(db, params.customerId, params.amount)
  }

  // Track in accounts if payment mode is cash or bank
  if (params.paymentMode === 'cash' || params.paymentMode === 'bank') {
    const accountType = params.paymentMode as AccountType
    const txType = params.deliveryId ? 'delivery_collection' : 'payment_received'
    await recordAccountTransaction(db, {
      accountType,
      amount: params.amount,
      transactionType: txType,
      referenceId: params.deliveryId,
      referenceType: params.deliveryId ? 'delivery' : 'payment',
      notes: params.notes,
      user: params.user,
    })
  }

  await clearPromiseIfSettled(db, params.customerId)

  return payment
}

// A payment promise ("will pay on Saturday") is fulfilled once the customer's
// outstanding balance reaches zero — clear it so stale promises don't linger.
export async function clearPromiseIfSettled(db: ReturnType<typeof useDB>, customerId: number) {
  const customer = await db.select().from(customers).where(eq(customers.id, customerId)).get()
  if (!customer?.promisedPayDate) return

  const [billed, paid] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(${deliveries.totalAmount}), 0)` })
      .from(deliveries)
      .where(and(eq(deliveries.customerId, customerId), eq(deliveries.status, 'delivered')))
      .get(),
    db.select({ total: sql<number>`coalesce(sum(${customerPayments.amount}), 0)` })
      .from(customerPayments)
      .where(eq(customerPayments.customerId, customerId))
      .get(),
  ])

  const balance = (customer.openingBalance ?? 0) + (billed?.total ?? 0) - (paid?.total ?? 0)
  if (balance <= 0.01) {
    await db.update(customers)
      .set({ promisedPayDate: null, promisedPayNote: null })
      .where(eq(customers.id, customerId))
  }
}
