import { FetchError } from 'ofetch'
import type { ApiResponse, ApiListResponse } from '~/types/api'
import type { Product, NewProduct, Price, NewPrice } from '~/types/database'

export function usePricing() {
  const error = ref<string | null>(null)
  const loading = ref(false)

  function handleError(err: unknown, fallback: string) {
    error.value = err instanceof FetchError ? (err.data?.message ?? fallback) : 'Network error. Please check your connection.'
  }

  async function fetchProducts() {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiListResponse<Product>>('/api/products')
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to load products')
      return []
    } finally {
      loading.value = false
    }
  }

  async function createProduct(data: NewProduct) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<Product>>('/api/products', { method: 'POST', body: data })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to create product')
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateProduct(id: number, data: Partial<NewProduct>) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<Product>>(`/api/products/${id}`, { method: 'PATCH', body: data })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to update product')
      return null
    } finally {
      loading.value = false
    }
  }

  async function fetchPrices(productId?: number) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiListResponse<Price>>('/api/prices', {
        query: productId ? { productId } : {},
      })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to load prices')
      return []
    } finally {
      loading.value = false
    }
  }

  async function createPrice(data: NewPrice) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<Price>>('/api/prices', { method: 'POST', body: data })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to create price')
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteProduct(productId: number) {
    error.value = null
    loading.value = true
    try {
      await $fetch(`/api/products/${productId}`, { method: 'DELETE' })
      return true
    } catch (err: unknown) {
      handleError(err, 'Failed to delete product')
      return false
    } finally {
      loading.value = false
    }
  }

  return { fetchProducts, createProduct, updateProduct, fetchPrices, createPrice, deleteProduct, loading, error }
}
