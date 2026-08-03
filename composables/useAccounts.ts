import { FetchError } from 'ofetch'
import type { ApiResponse } from '~/types/api'
import type { AccountTransaction } from '~/types/database'
import type { AccountType } from '~/types'

export interface AccountBalances {
  cash: number
  bank: number
  total: number
}

export function useAccounts() {
  const error = ref<string | null>(null)
  const loading = ref(false)

  function handleError(err: unknown, fallback: string) {
    error.value = err instanceof FetchError ? (err.data?.message ?? fallback) : 'Network error. Please check your connection.'
  }

  async function fetchBalances() {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<AccountBalances>>('/api/accounts')
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to load balances')
      return { cash: 0, bank: 0, total: 0 }
    } finally {
      loading.value = false
    }
  }

  async function fetchTransactions(params?: { accountType?: AccountType; limit?: number }) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<AccountTransaction[]>>('/api/accounts/transactions', { query: params ?? {} })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to load transactions')
      return []
    } finally {
      loading.value = false
    }
  }

  async function withdraw(accountType: AccountType, amount: number, notes?: string, salaryForName?: string) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<{ balance: number; transaction: AccountTransaction }>>('/api/accounts/withdraw', {
        method: 'POST',
        body: { accountType, amount, notes, salaryForName },
      })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to record withdrawal')
      return null
    } finally {
      loading.value = false
    }
  }

  async function deposit(accountType: AccountType, amount: number, notes?: string) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<{ balance: number; transaction: AccountTransaction }>>('/api/accounts/deposit', {
        method: 'POST',
        body: { accountType, amount, notes },
      })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to record deposit')
      return null
    } finally {
      loading.value = false
    }
  }

  async function convert(from: AccountType, amount: number, notes?: string) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<{ from: string; to: string; amount: number }>>('/api/accounts/convert', {
        method: 'POST',
        body: { from, amount, notes },
      })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to convert')
      return null
    } finally {
      loading.value = false
    }
  }

  return { fetchBalances, fetchTransactions, convert, withdraw, deposit, loading, error }
}
