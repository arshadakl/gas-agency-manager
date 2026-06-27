import { FetchError } from 'ofetch'
import type { ApiResponse, ApiListResponse } from '~/types/api'
import type { Purchase, PurchaseItem } from '~/types/database'
import type { CylinderSize } from '~/types'

export interface PurchaseLineItem {
  sizeKg: CylinderSize
  receivedQty: number
  returnedQty: number
  unitPrice?: number
}

export interface PurchaseWithItems extends Purchase {
  items: Array<PurchaseLineItem | PurchaseItem>
}

export interface PurchaseFormData {
  supplier: string
  purchaseDate: string
  totalAmount: number
  amountPaid: number
  paymentMode?: 'cash' | 'upi' | 'bank' | 'credit'
  dueDate?: string
  items: PurchaseLineItem[]
}

export function usePurchases() {
  const error = ref<string | null>(null)
  const loading = ref(false)

  function handleError(err: unknown, fallback: string) {
    error.value = err instanceof FetchError ? (err.data?.message ?? fallback) : 'Network error. Please check your connection.'
  }

  async function fetchPurchases(range?: { from?: string; to?: string }) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiListResponse<Purchase>>('/api/purchases', { query: range ?? {} })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to load purchases')
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchPurchase(id: number) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<PurchaseWithItems>>(`/api/purchases/${id}`)
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to load purchase')
      return null
    } finally {
      loading.value = false
    }
  }

  async function createPurchase(data: PurchaseFormData) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<PurchaseWithItems>>('/api/purchases', { method: 'POST', body: data })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to record purchase')
      return null
    } finally {
      loading.value = false
    }
  }

  async function updatePurchase(id: number, data: PurchaseFormData) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<PurchaseWithItems>>(`/api/purchases/${id}`, { method: 'PATCH', body: data })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to update purchase')
      return null
    } finally {
      loading.value = false
    }
  }

  async function deletePurchase(id: number) {
    error.value = null
    loading.value = true
    try {
      await $fetch(`/api/purchases/${id}`, { method: 'DELETE' })
      return true
    } catch (err: unknown) {
      handleError(err, 'Failed to delete purchase')
      return false
    } finally {
      loading.value = false
    }
  }

  return { fetchPurchases, fetchPurchase, createPurchase, updatePurchase, deletePurchase, loading, error }
}
