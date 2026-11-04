import type { ExpenseTag, PaymentSource } from '~/types'

export const TAG_LABELS: Record<ExpenseTag, string> = {
  fuel: 'Fuel',
  maintenance: 'Vehicle Maintenance',
  free_accessory: 'Free Accessory',
  other: 'Other',
  salary: 'Salary',
}

export const TAG_ICONS: Record<ExpenseTag, string> = {
  fuel: 'local_gas_station',
  maintenance: 'build',
  free_accessory: 'inventory_2',
  other: 'more_horiz',
  salary: 'account_circle',
}

export const TAG_COLORS: Record<ExpenseTag, string> = {
  fuel: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  maintenance: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  free_accessory: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  other: 'bg-surface-container-highest text-on-surface-variant border-outline-variant/30',
  salary: 'bg-teal-500/10 text-teal-500 border-teal-500/30',
}

export const SOURCE_LABELS: Record<PaymentSource, string> = { cash: 'Cash', bank: 'Bank' }
export const SOURCE_ICONS: Record<PaymentSource, string> = { cash: 'payments', bank: 'account_balance' }
export const SOURCE_COLORS: Record<PaymentSource, string> = {
  cash: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  bank: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
}
