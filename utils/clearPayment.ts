export interface ClearPaymentRow {
  id: number
  amount: number
  paymentMode: 'cash' | 'bank'
}

let nextClearRowId = 1

export function makeClearRow(amount = 0, mode: 'cash' | 'bank' = 'cash'): ClearPaymentRow {
  return { id: nextClearRowId++, amount, paymentMode: mode }
}
