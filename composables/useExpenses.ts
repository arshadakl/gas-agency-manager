import { FetchError } from 'ofetch'
import { formatApiError } from '~/utils/apiError'
import type { ApiResponse, ApiListResponse } from '~/types/api'
import type { ExpenseTag } from '~/types'

export type PaymentSource = 'cash' | 'bank'

export interface Expense {
  id: number
  publicId: string | null
  expenseDate: string
  amount: number
  tag: ExpenseTag
  paymentSource: PaymentSource
  notes: string | null
  staffId?: number | null
  staffName?: string | null
  createdBy: number
  createdByName: string
  createdAt: string
}

export function useExpenses() {
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

  async function fetchExpenses(params?: { tag?: string; from?: string; to?: string }) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<{ data: Expense[]; total: number; byTag: Record<string, number>; bySource: Record<string, number> }>('/api/expenses', { query: params ?? {} })
      return result
    } catch (err: unknown) {
      handleError(err, 'Failed to load expenses')
      return { data: [], total: 0, byTag: {}, bySource: {} }
    } finally {
      loading.value = false
    }
  }

  async function getExpense(publicId: string) {
    error.value = null
    try {
      const result = await $fetch<ApiResponse<Expense>>(`/api/expenses/${publicId}`)
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to load expense')
      return null
    }
  }

  async function createExpense(data: { expenseDate: string; amount: number; tag: ExpenseTag; paymentSource?: PaymentSource; notes?: string; staffId?: number | null; staffName?: string | null }) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<Expense>>('/api/expenses', { method: 'POST', body: data })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to create expense', true)
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateExpense(publicId: string, data: Partial<{ expenseDate: string; amount: number; tag: ExpenseTag; paymentSource: PaymentSource; notes: string; staffId: number | null; staffName: string | null }>) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<Expense>>(`/api/expenses/${publicId}`, { method: 'PATCH', body: data })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to update expense', true)
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteExpense(publicId: string) {
    error.value = null
    loading.value = true
    try {
      await $fetch(`/api/expenses/${publicId}`, { method: 'DELETE' })
      return true
    } catch (err: unknown) {
      handleError(err, 'Failed to delete expense', true)
      return false
    } finally {
      loading.value = false
    }
  }

  return { fetchExpenses, getExpense, createExpense, updateExpense, deleteExpense, loading, error }
}
