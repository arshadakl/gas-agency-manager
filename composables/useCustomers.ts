import { FetchError } from 'ofetch'
import type { ApiResponse, ApiListResponse } from '~/types/api'
import type { Customer, NewCustomer, Delivery, CustomerPayment, CustomerWithBalance } from '~/types/database'

interface CustomerLedger {
  customer: Customer
  totalBilled: number
  totalPaid: number
  balance: number
  deliveries: Delivery[]
  payments: CustomerPayment[]
}

export function useCustomers() {
  const error = ref<string | null>(null)
  const loading = ref(false)

  function handleError(err: unknown, fallback: string) {
    error.value = err instanceof FetchError ? (err.data?.message ?? fallback) : 'Network error. Please check your connection.'
  }

  async function fetchCustomers(search?: string) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiListResponse<CustomerWithBalance>>('/api/customers', {
        query: search ? { search } : {},
      })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to load customers')
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchCustomer(id: number) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<Customer>>(`/api/customers/${id}`)
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to load customer')
      return null
    } finally {
      loading.value = false
    }
  }

  async function fetchLedger(id: number) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<CustomerLedger>>(`/api/customers/${id}/ledger`)
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to load ledger')
      return null
    } finally {
      loading.value = false
    }
  }

  async function createCustomer(data: NewCustomer) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<Customer>>('/api/customers', { method: 'POST', body: data })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to create customer')
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateCustomer(id: number, data: Partial<NewCustomer>) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<Customer>>(`/api/customers/${id}`, { method: 'PATCH', body: data })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to update customer')
      return null
    } finally {
      loading.value = false
    }
  }

  async function fetchFavoriteProductId(id: number) {
    try {
      const result = await $fetch<ApiResponse<{ productId: number } | null>>(`/api/customers/${id}/favorite-product`)
      return result.data?.productId ?? null
    } catch {
      return null
    }
  }

  return { fetchCustomers, fetchCustomer, fetchLedger, createCustomer, updateCustomer, fetchFavoriteProductId, loading, error }
}
