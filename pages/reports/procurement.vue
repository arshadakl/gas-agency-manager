<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { fetchProcurement, dateRange, loading } = useReports()
const report = ref<Awaited<ReturnType<typeof fetchProcurement>> | null>(null)

async function load() {
  report.value = await fetchProcurement()
}
watch(dateRange, load, { immediate: true })
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg">
    <h1 class="text-headline-md text-on-surface">Buying vs Selling</h1>
    <DateRangeFilter />

    <div v-if="loading && !report" class="flex justify-center py-8">
      <LoadingSpinner />
    </div>
    <div v-else-if="report" class="grid grid-cols-2 gap-sm">
      <KpiCard label="Money Spent Buying" :value="formatCurrency(report.totalPurchased)" />
      <KpiCard label="Money Made Selling" :value="formatCurrency(report.totalDelivered)" />
      <KpiCard label="Cylinders Bought" :value="String(report.cylindersReceived)" />
      <KpiCard label="Cylinders Sent Out" :value="String(report.cylindersDeliveredOut)" />
    </div>
  </div>
</template>
