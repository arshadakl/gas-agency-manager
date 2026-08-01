import type { ExpenseTag, PaymentSource } from '~/types'

export const TAG_LABELS: Record<ExpenseTag, string> = {
  fuel: 'Fuel',
  maintenance: 'Vehicle Maintenance',
  free_accessory: 'Free Accessory',
  other: 'Other',
}

export const TAG_COLORS: Record<ExpenseTag, string> = {
  fuel: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  maintenance: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  free_accessory: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  other: 'bg-surface-container-highest text-on-surface-variant border-outline-variant/30',
}

export const SOURCE_LABELS: Record<PaymentSource, string> = { cash: 'Cash', bank: 'Bank' }
export const SOURCE_ICONS: Record<PaymentSource, string> = { cash: 'payments', bank: 'account_balance' }
export const SOURCE_COLORS: Record<PaymentSource, string> = {
  cash: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  bank: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
}
