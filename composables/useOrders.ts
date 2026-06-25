import { FetchError } from 'ofetch'
import type { ApiResponse, ApiListResponse } from '~/types/api'
import type { OrderWithRelations, Delivery } from '~/types/database'
import type { OrderStatus, DeliveryPaymentStatus, PaymentMode } from '~/types'

export interface OrderCreatePayload {
  customerId: number
  orderDate: string
  items: Array<{ productId: number; quantity: number }>
  notes?: string
}

export interface OrderDeliverPayload {
  deliveryDate: string
  paymentStatus: DeliveryPaymentStatus
  paymentMode?: PaymentMode
}

export function useOrders() {
  const error = ref<string | null>(null)
  const loading = ref(false)

  function handleError(err: unknown, fallback: string) {
    error.value = err instanceof FetchError ? (err.data?.message ?? fallback) : 'Network error. Please check your connection.'
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

  async function fetchOrder(id: number) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<OrderWithRelations>>(`/api/orders/${id}`)
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
      handleError(err, 'Failed to create order')
      return null
    } finally {
      loading.value = false
    }
  }

  async function deliverOrder(id: number, data: OrderDeliverPayload) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<{ order: OrderWithRelations; delivery: Delivery }>>(`/api/orders/${id}/deliver`, {
        method: 'POST',
        body: data,
      })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to mark order delivered')
      return null
    } finally {
      loading.value = false
    }
  }

  async function cancelOrder(id: number) {
    error.value = null
    loading.value = true
    try {
      await $fetch(`/api/orders/${id}/cancel`, { method: 'POST' })
      return true
    } catch (err: unknown) {
      handleError(err, 'Failed to cancel order')
      return false
    } finally {
      loading.value = false
    }
  }

  return { fetchOrders, fetchOrder, createOrder, deliverOrder, cancelOrder, loading, error }
}
