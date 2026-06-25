<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { fetchCylinders, dateRange, loading } = useReports()
const rows = ref<Awaited<ReturnType<typeof fetchCylinders>>>([])

async function load() {
  rows.value = await fetchCylinders()
}
watch(dateRange, load, { immediate: true })

const breakdown = computed(() => rows.value.map((r) => ({ cylinderSize: r.sizeKg, totalQuantity: r.totalDelivered })))
const totalRevenue = computed(() => rows.value.reduce((sum, r) => sum + r.totalRevenue, 0))
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg">
    <h1 class="text-headline-md text-on-surface">Cylinders Delivered</h1>
    <DateRangeFilter />

    <div v-if="loading && rows.length === 0" class="flex justify-center py-8">
      <LoadingSpinner />
    </div>
    <EmptyState v-else-if="rows.length === 0" title="No deliveries in this range" />
    <template v-else>
      <KpiCard hero label="Total Revenue" :value="formatCurrency(totalRevenue)" />
      <section class="bg-surface-container rounded-xl p-5 space-y-md">
        <h2 class="text-data-primary text-on-surface flex items-center gap-2">
          <Icon name="local_shipping" class="text-primary-fixed-dim" /> By Size
        </h2>
        <CylinderSummaryChart :breakdown="breakdown" />
      </section>
    </template>
  </div>
</template>
