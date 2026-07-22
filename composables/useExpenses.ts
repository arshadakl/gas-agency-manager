import { FetchError } from 'ofetch'
import type { ApiResponse, ApiListResponse } from '~/types/api'
import type { ExpenseTag } from '~/types'

export interface Expense {
  id: number
  expenseDate: string
  amount: number
  tag: ExpenseTag
  notes: string | null
  createdBy: number
  createdByName: string
  createdAt: string
}

export function useExpenses() {
  const error = ref<string | null>(null)
  const loading = ref(false)

  function handleError(err: unknown, fallback: string) {
    error.value = err instanceof FetchError ? (err.data?.message ?? fallback) : 'Network error. Please check your connection.'
  }

  async function fetchExpenses(params?: { tag?: string; from?: string; to?: string }) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<{ data: Expense[]; total: number; byTag: Record<string, number> }>('/api/expenses', { query: params ?? {} })
      return result
    } catch (err: unknown) {
      handleError(err, 'Failed to load expenses')
      return { data: [], total: 0, byTag: {} }
    } finally {
      loading.value = false
    }
  }

  async function createExpense(data: { expenseDate: string; amount: number; tag: ExpenseTag; notes?: string }) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<Expense>>('/api/expenses', { method: 'POST', body: data })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to create expense')
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateExpense(id: number, data: Partial<{ expenseDate: string; amount: number; tag: ExpenseTag; notes: string }>) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<Expense>>(`/api/expenses/${id}`, { method: 'PATCH', body: data })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to update expense')
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteExpense(id: number) {
    error.value = null
    loading.value = true
    try {
      await $fetch(`/api/expenses/${id}`, { method: 'DELETE' })
      return true
    } catch (err: unknown) {
      handleError(err, 'Failed to delete expense')
      return false
    } finally {
      loading.value = false
    }
  }

  return { fetchExpenses, createExpense, updateExpense, deleteExpense, loading, error }
}
