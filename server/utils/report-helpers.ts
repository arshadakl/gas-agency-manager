import { format } from 'date-fns'

export function getPreviousPeriod(from: string, to: string) {
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const duration = toDate.getTime() - fromDate.getTime()

  const prevTo = new Date(fromDate.getTime() - 86400000)
  const prevFrom = new Date(prevTo.getTime() - duration)

  return {
    from: format(prevFrom, 'yyyy-MM-dd'),
    to: format(prevTo, 'yyyy-MM-dd'),
  }
}

export function getDelta(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 1000) / 10
}
