import type { FeatureKey } from '~/types'
import type { ApiResponse } from '~/types/api'

export function usePermissions() {
  const { user, fetch: refreshSession } = useUserSession()

  const freshFeatures = ref<FeatureKey[] | null>(null)
  const permissionsLoaded = ref(false)

  // Pending promise for awaiting permissions load
  let pendingPromise: Promise<void> | null = null

  const disabledFeatures = computed<FeatureKey[]>(() => {
    if (freshFeatures.value !== null) return freshFeatures.value
    if (!user.value) return []
    if (user.value.role === 'admin') return []
    return (user.value.featuresDisabled ?? []) as FeatureKey[]
  })

  function hasFeature(feature: FeatureKey): boolean {
    if (!user.value) return false
    if (user.value.role === 'admin') return true
    return !disabledFeatures.value.includes(feature)
  }

  async function doRefresh(): Promise<void> {
    try {
      const res = await $fetch<ApiResponse<{ featuresDisabled: FeatureKey[] }>>('/api/auth/me')
      freshFeatures.value = res.data.featuresDisabled ?? []
      await refreshSession()
    } catch {
      // Fall back to session data
    } finally {
      permissionsLoaded.value = true
    }
  }

  // Fetch fresh permissions from DB (deduped)
  function refreshPermissions(): Promise<void> {
    if (!import.meta.client) {
      permissionsLoaded.value = true
      return Promise.resolve()
    }
    if (permissionsLoaded.value && !pendingPromise) return Promise.resolve()
    if (!pendingPromise) {
      pendingPromise = doRefresh().finally(() => { pendingPromise = null })
    }
    return pendingPromise
  }

  return { hasFeature, disabledFeatures, permissionsLoaded, refreshPermissions }
}
