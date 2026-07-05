import { FetchError } from 'ofetch'
import type { ApiResponse, ApiListResponse } from '~/types/api'
import type { Delivery, DeliveryWithRelations } from '~/types/database'
import type { PaymentMode } from '~/types'

interface DeliveryFormItem {
  productId: number
  quantity: number
}

export interface DeliveryCreatePayload {
  customerId: number
  deliveryDate: string
  totalAmount: number
  items: DeliveryFormItem[]
  notes?: string
  amountCollected?: number
  paymentMode?: PaymentMode
}

export function useDeliveries() {
  const error = ref<string | null>(null)
  const loading = ref(false)

  function handleError(err: unknown, fallback: string) {
    error.value = err instanceof FetchError ? (err.data?.message ?? fallback) : 'Network error. Please check your connection.'
  }

  async function fetchDeliveries(range?: { from?: string; to?: string; mine?: boolean }) {
    error.value = null
    loading.value = true
    try {
      const query = range ? { ...range, mine: range.mine ? 'true' : undefined } : {}
      const result = await $fetch<ApiListResponse<DeliveryWithRelations>>('/api/deliveries', { query })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to load deliveries')
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchToday() {
    const today = toISODate(new Date())
    return fetchDeliveries({ from: today, to: today })
  }

  async function createDelivery(data: DeliveryCreatePayload) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<Delivery>>('/api/deliveries', { method: 'POST', body: data })
      return { delivery: result.data, queuedOffline: false }
    } catch (err: unknown) {
      if (err instanceof FetchError) {
        handleError(err, 'Failed to create delivery')
        return null
      }
      await useOfflineQueue().queueDelivery(data)
      return { delivery: null, queuedOffline: true }
    } finally {
      loading.value = false
    }
  }

  async function updateDelivery(publicId: string, data: DeliveryCreatePayload) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<Delivery>>(`/api/deliveries/${publicId}`, {
        method: 'PATCH',
        body: data,
      })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to update delivery')
      return null
    } finally {
      loading.value = false
    }
  }

  async function collectPayment(publicId: string, amount: number, paymentMode: PaymentMode) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<Delivery>>(`/api/deliveries/${publicId}/collect`, {
        method: 'POST',
        body: { amount, paymentMode },
      })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to collect payment')
      return null
    } finally {
      loading.value = false
    }
  }

  return { fetchDeliveries, fetchToday, createDelivery, updateDelivery, collectPayment, loading, error }
}
