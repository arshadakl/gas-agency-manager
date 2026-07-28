<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { fetchStaff, dateRange, loading } = useReports()
const rows = ref<Awaited<ReturnType<typeof fetchStaff>>>([])

async function load() {
  rows.value = await fetchStaff()
}
watch(dateRange, load, { immediate: true })

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg">
    <h1 class="text-headline-md text-on-surface">Staff Work</h1>
    <DateRangeFilter />

    <div v-if="loading && rows.length === 0" class="flex justify-center py-8">
      <LoadingSpinner />
    </div>
    <EmptyState v-else-if="rows.length === 0" title="No data in this range" />
    <div v-else class="flex flex-col gap-sm">
      <NuxtLink
        v-for="row in rows"
        :key="row.createdBy"
        :to="`/reports/staff/${row.createdBy}`"
        class="flex items-center justify-between p-4 bg-surface-container rounded-xl border border-outline-variant/20 hover:border-outline-variant/40 transition-colors"
      >
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-highest text-data-secondary font-bold text-on-surface-variant">
            {{ initials(row.createdByName || 'U') }}
          </span>
          <div>
            <p class="text-data-primary text-on-surface">{{ row.createdByName || 'Unknown' }}</p>
            <p class="text-data-tertiary text-on-surface-variant">{{ row.deliveryCount }} deliveries · {{ row.paymentCount }} payments</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div v-if="row.totalCollected > 0" class="flex flex-col items-end gap-0.5">
            <div v-if="row.cashCollected > 0" class="flex items-center gap-1">
              <Icon name="payments" class="text-[12px] text-emerald-500" />
              <span class="text-data-secondary text-on-surface">{{ formatCurrency(row.cashCollected) }}</span>
            </div>
            <div v-if="row.bankCollected > 0" class="flex items-center gap-1">
              <Icon name="account_balance" class="text-[12px] text-blue-500" />
              <span class="text-data-secondary text-on-surface">{{ formatCurrency(row.bankCollected) }}</span>
            </div>
          </div>
          <Icon name="chevron_right" class="text-on-surface-variant" />
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
