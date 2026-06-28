import { FetchError } from 'ofetch'
import type { ApiResponse, ApiListResponse } from '~/types/api'
import type { User } from '#auth-utils'
import type { User as AppUser } from '~/types/database'

export function useAuth() {
  const { user, loggedIn, session, fetch: refreshSession, clear } = useUserSession()
  const error = ref<string | null>(null)
  const loading = ref(false)

  function handleError(err: unknown, fallback: string) {
    error.value = err instanceof FetchError ? (err.data?.message ?? fallback) : 'Network error. Please check your connection.'
  }

  async function login(username: string, password: string) {
    error.value = null
    loading.value = true
    try {
      await $fetch<ApiResponse<User>>('/api/auth/login', {
        method: 'POST',
        body: { username, password },
      })
      await refreshSession()
      return true
    } catch (err: unknown) {
      error.value = err instanceof FetchError ? (err.data?.message ?? 'Login failed') : 'Network error. Please check your connection.'
      return false
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } catch { /* ignore — server session may already be expired */ }
    try {
      await clear()
    } catch { /* ignore — clear() may fail if cookie already gone */ }
    window.location.replace('/login')
  }

  async function fetchUsers() {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiListResponse<AppUser>>('/api/settings/users')
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to load users')
      return []
    } finally {
      loading.value = false
    }
  }

  async function createUser(data: { username: string; fullName: string; role: string; password: string }) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<AppUser>>('/api/settings/users', { method: 'POST', body: data })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to create user')
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateUser(id: number, data: { fullName?: string; role?: string; isActive?: boolean; newPassword?: string }) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<AppUser>>(`/api/settings/users/${id}`, { method: 'PATCH', body: data })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to update user')
      return null
    } finally {
      loading.value = false
    }
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    if (!user.value) return false
    error.value = null
    loading.value = true
    try {
      await $fetch(`/api/settings/users/${user.value.id}`, {
        method: 'PATCH',
        body: { currentPassword, newPassword },
      })
      return true
    } catch (err: unknown) {
      handleError(err, 'Failed to change password')
      return false
    } finally {
      loading.value = false
    }
  }

  async function deleteUser(userId: number) {
    error.value = null
    loading.value = true
    try {
      await $fetch(`/api/settings/users/${userId}`, { method: 'DELETE' })
      return true
    } catch (err: unknown) {
      handleError(err, 'Failed to delete user')
      return false
    } finally {
      loading.value = false
    }
  }

  return { user, loggedIn, session, login, logout, fetchUsers, createUser, updateUser, changePassword, deleteUser, error, loading }
}
