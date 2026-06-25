import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfYear, format } from 'date-fns'

export type DatePreset = 'this_week' | 'this_month' | '3_months' | '6_months' | 'this_year' | 'custom'

export const DATE_PRESETS: Array<{ value: DatePreset; label: string }> = [
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: '3_months', label: '3 Months' },
  { value: '6_months', label: '6 Months' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom', label: 'Custom' },
]

export function getPresetRange(preset: DatePreset): { from: string; to: string } {
  const today = new Date()
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd')

  switch (preset) {
    case 'this_week':
      return { from: fmt(startOfWeek(today, { weekStartsOn: 1 })), to: fmt(endOfWeek(today, { weekStartsOn: 1 })) }
    case 'this_month':
      return { from: fmt(startOfMonth(today)), to: fmt(endOfMonth(today)) }
    case '3_months':
      return { from: fmt(subMonths(today, 3)), to: fmt(today) }
    case '6_months':
      return { from: fmt(subMonths(today, 6)), to: fmt(today) }
    case 'this_year':
      return { from: fmt(startOfYear(today)), to: fmt(today) }
    case 'custom':
      return { from: '', to: '' }
  }
}
