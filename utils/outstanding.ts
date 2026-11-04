export const OUTSTANDING_LEVELS = ['clear', 'warning', 'high', 'critical'] as const
export type OutstandingLevel = typeof OUTSTANDING_LEVELS[number]

// 0 deliveries owed and <= 0 balance = clear
// 1 delivery owed OR positive balance with 0 deliveries = warning (yellow)
// 2-3 deliveries owed = high (light red)
// 4+ deliveries owed = critical (red)
export function getOutstandingLevel(pendingDeliveryCount: number, balance = 0): OutstandingLevel {
  if (pendingDeliveryCount >= 4) return 'critical'
  if (pendingDeliveryCount >= 2) return 'high'
  if (pendingDeliveryCount === 1) return 'warning'
  if (balance > 0.01) return 'warning'
  return 'clear'
}
