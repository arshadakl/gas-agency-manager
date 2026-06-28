<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { fetchTopCustomers, dateRange, loading } = useReports()
const rows = ref<Awaited<ReturnType<typeof fetchTopCustomers>>>([])

async function load() {
  rows.value = await fetchTopCustomers()
}
watch(dateRange, load, { immediate: true })
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg">
    <h1 class="text-headline-md text-on-surface">Top Customers</h1>
    <DateRangeFilter />

    <div v-if="loading && rows.length === 0" class="flex justify-center py-8">
      <LoadingSpinner />
    </div>
    <EmptyState v-else-if="rows.length === 0" title="No billing in this range" />
    <div v-else class="bg-surface-container rounded-xl overflow-hidden divide-y divide-surface-container-highest">
      <NuxtLink
        v-for="(row, index) in rows"
        :key="row.customerId"
        :to="`/customers/${row.customerPublicId}`"
        class="flex items-center justify-between p-4 transition-colors"
        :class="index === 0 ? 'bg-surface-container-high/50' : 'hover:bg-surface-container-high/30'"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-6 h-6 rounded-full flex items-center justify-center text-data-secondary font-bold text-xs"
            :class="index === 0 ? 'bg-primary/20 text-primary-fixed-dim' : 'bg-surface-container-highest text-on-surface-variant'"
          >
            {{ index + 1 }}
          </div>
          <div>
            <p class="text-data-primary text-on-surface">{{ row.name }}</p>
            <p class="text-data-tertiary text-on-surface-variant">{{ row.deliveryCount }} deliveries</p>
          </div>
        </div>
        <span class="text-data-secondary" :class="index === 0 ? 'text-primary-fixed-dim' : 'text-on-surface-variant'">{{ formatCurrency(row.totalBilled) }}</span>
      </NuxtLink>
    </div>
  </div>
</template>
