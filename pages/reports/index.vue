<script setup lang="ts">
import type { FeatureKey } from '~/types'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { hasFeature, refreshPermissions } = usePermissions()
await refreshPermissions()
const { fetchSummary, dateRange, loading } = useReports()
const summary = ref<Awaited<ReturnType<typeof fetchSummary>> | null>(null)

async function load() {
  summary.value = await fetchSummary()
}
watch(dateRange, load, { immediate: true })

const links = [
  { to: '/accounts', label: 'SuperGas Accounts', icon: 'account_balance', feature: 'super_gas_accounts' as FeatureKey },
  { to: '/reports/own-cylinders', label: 'Own Cylinders', icon: 'new_releases', feature: null },
  { to: '/reports/cylinders', label: 'Cylinders Delivered', icon: 'local_shipping', feature: null },
  { to: '/reports/customers', label: 'Top Customers', icon: 'groups', feature: null },
  { to: '/reports/staff', label: 'Staff Work', icon: 'badge', feature: null },
  { to: '/reports/profit-loss', label: 'Profit & Loss', icon: 'trending_up', feature: 'profit_loss' as FeatureKey },
]

const visibleLinks = computed(() => links.filter(l => !l.feature || hasFeature(l.feature)))
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg pb-40">
    <h1 class="text-headline-md text-on-surface">Reports</h1>
    <DateRangeFilter :max-months="hasFeature('reports_full_range') ? null : 3" />

    <div v-if="loading && !summary" class="flex justify-center py-8">
      <LoadingSpinner />
    </div>
    <section v-else-if="summary" class="grid grid-cols-1 gap-sm">
      <div class="bg-surface-container-high rounded-xl p-5 flex flex-col justify-between h-28 relative overflow-hidden">
        <span class="text-data-secondary text-on-surface-variant z-10">Total Billed</span>
        <span class="text-display-lg text-on-surface z-10 text-3xl">{{ formatCurrency(summary.billed) }}</span>
        <div class="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
      </div>
      <div class="bg-surface-container-high rounded-xl p-5 flex flex-col justify-between h-28 relative overflow-hidden">
        <span class="text-data-secondary text-on-surface-variant z-10">Collected</span>
        <span class="text-display-lg text-tertiary z-10 text-3xl">{{ formatCurrency(summary.collected) }}</span>
        <div class="absolute -bottom-4 -right-4 w-24 h-24 bg-tertiary/10 rounded-full blur-2xl" />
      </div>
      <div class="bg-surface-container-high rounded-xl p-5 flex flex-col justify-between h-28 relative overflow-hidden border border-error/20">
        <span class="text-data-secondary text-on-surface-variant z-10">Pending</span>
        <span class="text-display-lg text-error z-10 text-3xl">{{ formatCurrency(summary.outstanding) }}</span>
        <div class="absolute -bottom-4 -right-4 w-24 h-24 bg-error/10 rounded-full blur-2xl" />
      </div>
    </section>

    <div class="flex flex-col gap-sm">
      <NuxtLink
        v-for="link in visibleLinks"
        :key="link.to"
        :to="link.to"
        class="flex items-center gap-3 rounded-xl bg-surface-container p-4 border border-outline-variant/20 hover:border-outline-variant/40 transition-colors"
      >
        <Icon :name="link.icon" class="text-primary-fixed-dim" />
        <span class="text-data-primary text-on-surface">{{ link.label }}</span>
        <Icon name="chevron_right" class="text-on-surface-variant ml-auto" />
      </NuxtLink>
    </div>
  </div>
</template>
