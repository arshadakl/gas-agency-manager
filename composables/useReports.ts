import { FetchError } from 'ofetch'
import type { ApiResponse } from '~/types/api'
import type { Delivery, Order, CustomerPayment } from '~/types/database'
import { getPresetRange, type DatePreset } from '~/utils/datePresets'

interface ReportSummary {
  billed: number
  collected: number
  outstanding: number
  previousBilled: number
  previousCollected: number
  billedDelta: number | null
  collectedDelta: number | null
}

interface CylinderReportRow { sizeKg: number | null; totalDelivered: number; totalRevenue: number }
interface EmptiesReportRow { sizeKg: number; totalCollected: number }
interface PaymentsReportRow { paymentMode: string; totalAmount: number; count: number }
interface CustomerReportRow { customerId: number; customerPublicId: string | null; name: string; totalBilled: number; deliveryCount: number }
interface StaffReportRow { createdBy: number; createdByName: string; deliveryCount: number; totalValue: number }
interface ProcurementReport {
  totalPurchased: number
  totalDelivered: number
  cylindersReceived: number
  cylindersDeliveredOut: number
}
interface StaffActivity { deliveries: Delivery[]; orders: Order[]; payments: CustomerPayment[] }

export function useReports() {
  const error = ref<string | null>(null)
  const loading = ref(false)

  // Shared across all report pages so the date filter persists while navigating (CLAUDE.md §11.2)
  const preset = useState<DatePreset>('reports-preset', () => 'this_month')
  const customFrom = useState('reports-custom-from', () => '')
  const customTo = useState('reports-custom-to', () => '')

  const dateRange = computed(() =>
    preset.value === 'custom' ? { from: customFrom.value, to: customTo.value } : getPresetRange(preset.value),
  )
  const canFetch = computed(() => Boolean(dateRange.value.from && dateRange.value.to))

  function setPreset(p: DatePreset) { preset.value = p }
  function setCustomRange(from: string, to: string) {
    customFrom.value = from
    customTo.value = to
    preset.value = 'custom'
  }

  function handleError(err: unknown, fallback: string) {
    error.value = err instanceof FetchError ? (err.data?.message ?? fallback) : 'Network error. Please check your connection.'
  }

  async function get<T>(path: string, fallback: T): Promise<T> {
    if (!canFetch.value) return fallback
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<T>>(path, { query: dateRange.value })
      return result.data
    } catch (err: unknown) {
      handleError(err, `Failed to load ${path}`)
      return fallback
    } finally {
      loading.value = false
    }
  }

  const fetchSummary = () => get<ReportSummary>('/api/reports/summary', {
    billed: 0, collected: 0, outstanding: 0, previousBilled: 0, previousCollected: 0, billedDelta: null, collectedDelta: null,
  })
  const fetchCylinders = () => get<CylinderReportRow[]>('/api/reports/cylinders', [])
  const fetchEmpties = () => get<EmptiesReportRow[]>('/api/reports/empties', [])
  const fetchPaymentsBreakdown = () => get<PaymentsReportRow[]>('/api/reports/payments', [])
  const fetchTopCustomers = () => get<CustomerReportRow[]>('/api/reports/customers', [])
  const fetchStaff = () => get<StaffReportRow[]>('/api/reports/staff', [])
  const fetchProcurement = () => get<ProcurementReport>('/api/reports/procurement', {
    totalPurchased: 0, totalDelivered: 0, cylindersReceived: 0, cylindersDeliveredOut: 0,
  })
  const fetchStaffActivity = (userId: number) =>
    get<StaffActivity>(`/api/reports/staff/${userId}/activity`, { deliveries: [], orders: [], payments: [] })

  return {
    preset, customFrom, customTo, dateRange, canFetch, setPreset, setCustomRange,
    fetchSummary, fetchCylinders, fetchEmpties, fetchPaymentsBreakdown, fetchTopCustomers, fetchStaff, fetchProcurement,
    fetchStaffActivity,
    loading, error,
  }
}
