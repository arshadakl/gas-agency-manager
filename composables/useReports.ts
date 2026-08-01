import { FetchError } from 'ofetch'
import type { ApiResponse } from '~/types/api'
import type { Order } from '~/types/database'
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
interface CustomerReportRow { customerId: number; customerPublicId: string | null; name: string; type: string; totalBilled: number; deliveryCount: number }
interface StaffReportRow { createdBy: number; createdByName: string; deliveryCount: number; totalValue: number; cashCollected: number; bankCollected: number; totalCollected: number; paymentCount: number }
interface ProcurementReport {
  totalPurchased: number
  totalDelivered: number
  cylindersReceived: number
  cylindersDeliveredOut: number
}
interface ProfitLossReport {
  revenue: { totalBilled: number; cashCollected: number; bankCollected: number; totalCollected: number }
  costs: { gasPurchases: number; connectionCharges: number; totalPurchases: number }
  expenses: { fuel: number; maintenance: number; fine: number; other: number; total: number }
  withdrawals: { total: number; count: number }
  grossProfit: number
  netProfit: number
  previous: { grossProfit: number; netProfit: number; grossDelta: number | null; netDelta: number | null }
}
interface TrendMonth { month: string; revenue: number; costs: number; expenses: number; profit: number }
interface StaffActivityDelivery { id: number; customerId: number; customerName: string; deliveryDate: string; totalAmount: number; status: string; paymentStatus: string; notes: string | null }
interface StaffActivityPayment { id: number; customerId: number; customerName: string; amount: number; paymentMode: string; paymentDate: string; notes: string | null }
interface StaffActivity { deliveries: StaffActivityDelivery[]; orders: Order[]; payments: StaffActivityPayment[] }

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

  async function get<T>(path: string, fallback: T, extraQuery?: Record<string, string | undefined>): Promise<T> {
    if (!canFetch.value) return fallback
    error.value = null
    loading.value = true
    try {
      const query = { ...dateRange.value, ...extraQuery }
      const result = await $fetch<ApiResponse<T>>(path, { query })
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
  const fetchTopCustomers = (type?: string) => get<CustomerReportRow[]>('/api/reports/customers', [], { type })
  const fetchStaff = () => get<StaffReportRow[]>('/api/reports/staff', [])
  const fetchProcurement = () => get<ProcurementReport>('/api/reports/procurement', {
    totalPurchased: 0, totalDelivered: 0, cylindersReceived: 0, cylindersDeliveredOut: 0,
  })
  const fetchProfitLoss = () => get<ProfitLossReport>('/api/reports/profit-loss', {
    revenue: { totalBilled: 0, cashCollected: 0, bankCollected: 0, totalCollected: 0 },
    costs: { gasPurchases: 0, connectionCharges: 0, totalPurchases: 0 },
    expenses: { fuel: 0, maintenance: 0, fine: 0, other: 0, total: 0 },
    withdrawals: { total: 0, count: 0 },
    grossProfit: 0, netProfit: 0,
    previous: { grossProfit: 0, netProfit: 0, grossDelta: null, netDelta: null },
  })
  async function fetchProfitLossTrend(months = 6): Promise<TrendMonth[]> {
    if (!canFetch.value) return []
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<TrendMonth[]>>('/api/reports/profit-loss/trend', {
        query: { months },
      })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to load P&L trend')
      return []
    } finally {
      loading.value = false
    }
  }
  const fetchStaffActivity = (userId: number) =>
    get<StaffActivity>(`/api/reports/staff/${userId}/activity`, { deliveries: [], orders: [], payments: [] })

  return {
    preset, customFrom, customTo, dateRange, canFetch, setPreset, setCustomRange,
    fetchSummary, fetchCylinders, fetchEmpties, fetchPaymentsBreakdown, fetchTopCustomers, fetchStaff, fetchProcurement,
    fetchProfitLoss, fetchProfitLossTrend, fetchStaffActivity,
    loading, error,
  }
}
