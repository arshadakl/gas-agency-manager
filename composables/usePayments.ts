import { FetchError } from 'ofetch'
import type { ApiResponse, ApiListResponse } from '~/types/api'
import type { CustomerPayment, NewCustomerPayment, DeliveryItem, Product } from '~/types/database'
import type { PaymentMode } from '~/types'

export type CustomerPaymentWithRelations = CustomerPayment & {
  customerName: string
  items: Array<DeliveryItem & { product: Product }>
}

export interface PaymentFilters {
  customerId?: number
  from?: string
  to?: string
  paymentMode?: PaymentMode
}

export function usePayments() {
  const error = ref<string | null>(null)
  const loading = ref(false)

  function handleError(err: unknown, fallback: string) {
    error.value = err instanceof FetchError ? (err.data?.message ?? fallback) : 'Network error. Please check your connection.'
  }

  async function fetchPayments(filters?: PaymentFilters) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiListResponse<CustomerPaymentWithRelations>>('/api/payments', {
        query: { ...filters },
      })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to load payments')
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchTodayPayments() {
    const today = toISODate(new Date())
    return fetchPayments({ from: today, to: today })
  }

  async function recordPayment(data: Omit<NewCustomerPayment, 'createdBy' | 'createdByName'>) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<CustomerPayment>>('/api/payments', { method: 'POST', body: data })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to record payment')
      return null
    } finally {
      loading.value = false
    }
  }

  return { fetchPayments, fetchTodayPayments, recordPayment, loading, error }
}
