import type { FeatureKey } from '~/types'

export function usePermissions() {
  const { user } = useUserSession()

  const disabledFeatures = computed<FeatureKey[]>(() => {
    if (!user.value) return []
    if (user.value.role === 'admin') return []
    return (user.value.featuresDisabled ?? []) as FeatureKey[]
  })

  function hasFeature(feature: FeatureKey): boolean {
    if (!user.value) return false
    if (user.value.role === 'admin') return true
    return !disabledFeatures.value.includes(feature)
  }

  return { hasFeature, disabledFeatures }
}
