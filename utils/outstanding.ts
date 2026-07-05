export const OUTSTANDING_LEVELS = ['clear', 'warning', 'high', 'critical'] as const
export type OutstandingLevel = typeof OUTSTANDING_LEVELS[number]

// 0 deliveries owed = clear, 1 = warning (yellow), 2-3 = high (light red),
// 4+ = critical (red) — thresholds per client spec.
export function getOutstandingLevel(pendingDeliveryCount: number): OutstandingLevel {
  if (pendingDeliveryCount <= 0) return 'clear'
  if (pendingDeliveryCount === 1) return 'warning'
  if (pendingDeliveryCount <= 3) return 'high'
  return 'critical'
}
