import { FetchError } from 'ofetch'
import { formatApiError } from '~/utils/apiError'
import type { ApiResponse, ApiListResponse } from '~/types/api'
import type { OrderWithRelations, Delivery } from '~/types/database'
import type { OrderStatus, PaymentMode } from '~/types'

export interface OrderCreatePayload {
  customerId: number
  orderDate: string
  items: Array<{ productId: number; quantity: number }>
  notes?: string
}

export interface OrderDeliverPayload {
  deliveryDate: string
  amountCollected: number
  paymentMode?: PaymentMode
}

export function useOrders() {
  const error = ref<string | null>(null)
  const loading = ref(false)
  const { showToast } = useToast()

  function handleError(err: unknown, fallback: string, notify = false) {
    const msg = formatApiError(err, fallback)
    error.value = msg
    if (notify) {
      showToast(msg, 'destructive')
    }
  }

  async function fetchOrders(status?: OrderStatus) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiListResponse<OrderWithRelations>>('/api/orders', { query: status ? { status } : {} })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to load orders')
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchOrder(publicId: string) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<OrderWithRelations>>(`/api/orders/${publicId}`)
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to load order')
      return null
    } finally {
      loading.value = false
    }
  }

  async function createOrder(data: OrderCreatePayload) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<OrderWithRelations>>('/api/orders', { method: 'POST', body: data })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to create order', true)
      return null
    } finally {
      loading.value = false
    }
  }

  async function deliverOrder(publicId: string, data: OrderDeliverPayload) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<{ order: OrderWithRelations; delivery: Delivery }>>(`/api/orders/${publicId}/deliver`, {
        method: 'POST',
        body: data,
      })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to mark order delivered', true)
      return null
    } finally {
      loading.value = false
    }
  }

  async function cancelOrder(publicId: string) {
    error.value = null
    loading.value = true
    try {
      await $fetch(`/api/orders/${publicId}/cancel`, { method: 'POST' })
      return true
    } catch (err: unknown) {
      handleError(err, 'Failed to cancel order', true)
      return false
    } finally {
      loading.value = false
    }
  }

  return { fetchOrders, fetchOrder, createOrder, deliverOrder, cancelOrder, loading, error }
}
