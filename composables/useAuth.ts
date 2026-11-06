import { FetchError } from 'ofetch'
import { formatApiError } from '~/utils/apiError'
import type { ApiResponse, ApiListResponse } from '~/types/api'
import type { User } from '#auth-utils'
import type { User as AppUser } from '~/types/database'
import type { FeatureKey } from '~/types'

export function useAuth() {
  const { user, loggedIn, session, fetch: refreshSession, clear } = useUserSession()
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
      handleError(err, 'Login failed', true)
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
      handleError(err, 'Failed to create user', true)
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateUser(publicId: string, data: { fullName?: string; role?: string; isActive?: boolean; newPassword?: string; featuresDisabled?: FeatureKey[] }) {
    error.value = null
    loading.value = true
    try {
      const result = await $fetch<ApiResponse<AppUser>>(`/api/settings/users/${publicId}`, { method: 'PATCH', body: data })
      return result.data
    } catch (err: unknown) {
      handleError(err, 'Failed to update user', true)
      return null
    } finally {
      loading.value = false
    }
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    if (!user.value?.publicId) return false
    error.value = null
    loading.value = true
    try {
      await $fetch(`/api/settings/users/${user.value.publicId}`, {
        method: 'PATCH',
        body: { currentPassword, newPassword },
      })
      return true
    } catch (err: unknown) {
      handleError(err, 'Failed to change password', true)
      return false
    } finally {
      loading.value = false
    }
  }

  async function deleteUser(publicId: string) {
    error.value = null
    loading.value = true
    try {
      await $fetch(`/api/settings/users/${publicId}`, { method: 'DELETE' })
      return true
    } catch (err: unknown) {
      handleError(err, 'Failed to delete user', true)
      return false
    } finally {
      loading.value = false
    }
  }

  return { user, loggedIn, session, login, logout, fetchUsers, createUser, updateUser, changePassword, deleteUser, error, loading }
}
