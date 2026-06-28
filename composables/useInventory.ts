import { FetchError } from 'ofetch'
import type { ApiResponse, ApiListResponse } from '~/types/api'
import type { InventoryItem, CylinderStock, StockMovement } from '~/types/database'
import type { CylinderSize } from '~/types'

interface InventoryRow {
  productId: number
  productName: string
  type: string
  cylinderSize: number | null
  unit: string
  quantity: number
}

export interface StockAdjustmentInput {
  sizeKg: CylinderSize
  fullChange: number
  emptyChange: number
  notes?: string
}

export function useInventory() {
  const error = ref<string | null>(null)
  const loading = ref(false)

  function handleError(err: unknown, fallback: string) {
    error.value = err instanceof FetchError ? (err.data?.message ?? fallback) : 'Network error. Please check your connection.'
  }

  async function fetchInventory() {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiListResponse<InventoryRow>>('/api/inventory')
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to load inventory')
      return []
    } finally {
      loading.value = false
    }
  }

  async function stockIn(productId: number, quantity: number) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<InventoryItem>>('/api/inventory/stock-in', {
        method: 'POST',
        body: { productId, quantity },
      })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to record stock-in')
      return null
    } finally {
      loading.value = false
    }
  }

  async function fetchCylinderStock() {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiListResponse<CylinderStock>>('/api/inventory/cylinders')
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to load cylinder stock')
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchMovements(limit?: number) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiListResponse<StockMovement>>('/api/inventory/movements', {
        query: limit ? { limit } : {},
      })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to load stock movements')
      return []
    } finally {
      loading.value = false
    }
  }

  async function adjustStock(data: StockAdjustmentInput) {
    error.value = null
    loading.value = true
    try {
      await $fetch<ApiResponse<null>>('/api/inventory/adjustment', { method: 'POST', body: data })
      return true
    } catch (err: unknown) {
      handleError(err, 'Failed to adjust stock')
      return false
    } finally {
      loading.value = false
    }
  }

  async function collectEmpties(data: { date: string; items: { sizeKg: number; qty: number }[]; notes?: string; customerName?: string }) {
    error.value = null
    loading.value = true
    try {
      await $fetch<ApiResponse<null>>('/api/inventory/collect-empties', { method: 'POST', body: data })
      return true
    } catch (err: unknown) {
      handleError(err, 'Failed to record empty cylinders')
      return false
    } finally {
      loading.value = false
    }
  }

  return { fetchInventory, stockIn, fetchCylinderStock, fetchMovements, adjustStock, collectEmpties, loading, error }
}
