<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { fetchPaymentsBreakdown, dateRange, loading } = useReports()
const rows = ref<Awaited<ReturnType<typeof fetchPaymentsBreakdown>>>([])

async function load() {
  rows.value = await fetchPaymentsBreakdown()
}
watch(dateRange, load, { immediate: true })

const total = computed(() => rows.value.reduce((sum, r) => sum + r.totalAmount, 0))
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg">
    <h1 class="text-headline-md text-on-surface">Payment Types</h1>
    <DateRangeFilter />

    <div v-if="loading && rows.length === 0" class="flex justify-center py-8">
      <LoadingSpinner />
    </div>
    <EmptyState v-else-if="rows.length === 0" title="No payments in this range" />
    <section v-else class="bg-surface-container rounded-xl p-5 border border-surface-container-highest">
      <h2 class="text-data-primary text-on-surface flex items-center gap-2 mb-md">
        <Icon name="account_balance_wallet" class="text-secondary" /> Payment Types
      </h2>
      <div class="flex flex-col divide-y divide-surface-container-highest">
        <div v-for="row in rows" :key="row.paymentMode" class="flex-1 flex flex-col gap-1 py-3">
          <span class="text-data-secondary text-on-surface-variant uppercase tracking-wider">{{ row.paymentMode }}</span>
          <span class="text-headline-md text-on-surface">{{ total > 0 ? Math.round((row.totalAmount / total) * 100) : 0 }}%</span>
          <span class="text-data-tertiary text-secondary">{{ formatCurrency(row.totalAmount) }} · {{ row.count }} payments</span>
        </div>
      </div>
    </section>
  </div>
</template>
