<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

interface OwnCylinderSize { sizeKg: number; ownCount: number; count: number; cost: number }
interface OwnCylinderPurchase { publicId: string; purchaseDate: string; supplier: string; items: Array<{ sizeKg: number; ownQty: number; cost: number }> }
interface OwnCylindersReport {
  totalOwnCount: number
  totalOwnCost: number
  currentStock: Array<{ sizeKg: number; ownCount: number }>
  bySize: OwnCylinderSize[]
  purchases: OwnCylinderPurchase[]
}

const { dateRange, loading } = useReports()
const report = ref<OwnCylindersReport | null>(null)
const fetching = ref(false)

async function load() {
  if (!dateRange.value.from || !dateRange.value.to) return
  fetching.value = true
  try {
    const res = await $fetch<{ data: OwnCylindersReport }>('/api/reports/own-cylinders', { query: dateRange.value })
    report.value = res.data
  } catch {
    report.value = null
  } finally {
    fetching.value = false
  }
}
watch(dateRange, load, { immediate: true })
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg">
    <h1 class="text-headline-md text-on-surface">Own Cylinders</h1>
    <DateRangeFilter />

    <div v-if="fetching && !report" class="flex justify-center py-8">
      <LoadingSpinner />
    </div>

    <template v-else-if="report">
      <!-- KPI Cards -->
      <section class="grid grid-cols-2 gap-sm">
        <div class="bg-surface-container-high rounded-xl p-5 flex flex-col justify-between h-28 relative overflow-hidden">
          <span class="text-data-secondary text-on-surface-variant z-10">Own Cylinders</span>
          <span class="text-display-lg text-on-surface z-10 text-3xl">{{ report.totalOwnCount }}</span>
          <div class="absolute -bottom-4 -right-4 w-24 h-24 bg-tertiary/10 rounded-full blur-2xl" />
        </div>
        <div class="bg-surface-container-high rounded-xl p-5 flex flex-col justify-between h-28 relative overflow-hidden">
          <span class="text-data-secondary text-on-surface-variant z-10">Total Invested</span>
          <span class="text-display-lg text-primary-fixed-dim z-10 text-3xl">{{ formatCurrency(report.totalOwnCost) }}</span>
          <div class="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
        </div>
      </section>

      <!-- Current Stock (all-time own count per size) -->
      <section v-if="report.currentStock.some(r => r.ownCount > 0)" class="bg-surface-container rounded-xl p-5 border border-surface-container-highest">
        <h2 class="text-data-primary text-on-surface mb-md flex items-center gap-sm">
          <Icon name="inventory_2" :filled="true" class="text-tertiary" /> Current Own Cylinders
        </h2>
        <div class="space-y-xs">
          <div v-for="row in report.currentStock.filter(r => r.ownCount > 0)" :key="row.sizeKg" class="flex items-center justify-between py-2 border-b border-surface-container-highest last:border-0">
            <span class="text-body-base text-on-surface">{{ row.sizeKg }}kg</span>
            <span class="text-data-primary text-on-surface">{{ row.ownCount }} pcs</span>
          </div>
        </div>
      </section>

      <!-- Purchased in Period (per-size breakdown) -->
      <section v-if="report.bySize.length > 0" class="bg-surface-container rounded-xl p-5 border border-surface-container-highest">
        <h2 class="text-data-primary text-on-surface mb-md flex items-center gap-sm">
          <Icon name="new_releases" :filled="true" class="text-primary" /> Purchased in Period
        </h2>
        <div class="space-y-xs">
          <div v-for="row in report.bySize" :key="row.sizeKg" class="flex items-center justify-between py-2 border-b border-surface-container-highest last:border-0">
            <span class="text-body-base text-on-surface">{{ row.sizeKg }}kg</span>
            <div class="flex items-center gap-md">
              <span class="text-data-secondary text-on-surface-variant">{{ row.count }} pcs</span>
              <span class="text-data-primary text-primary-fixed-dim">{{ formatCurrency(row.cost) }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Purchase History -->
      <section v-if="report.purchases.length > 0" class="bg-surface-container rounded-xl p-5 border border-surface-container-highest">
        <h2 class="text-data-primary text-on-surface mb-md flex items-center gap-sm">
          <Icon name="receipt_long" :filled="true" class="text-primary" /> Purchase History
        </h2>
        <div class="space-y-md">
          <NuxtLink
            v-for="p in report.purchases"
            :key="p.publicId"
            :to="`/stock/purchases/${p.publicId}` as any"
            class="block py-3 border-b border-surface-container-highest last:border-0"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="text-data-secondary text-on-surface">{{ formatDate(p.purchaseDate) }}</span>
              <span class="text-data-tertiary text-on-surface-variant">{{ p.supplier }}</span>
            </div>
            <div class="flex flex-wrap gap-sm">
              <span
                v-for="item in p.items"
                :key="item.sizeKg"
                class="px-2 py-0.5 rounded-full bg-surface-container-highest text-data-tertiary text-on-surface-variant border border-outline-variant/20"
              >
                {{ item.ownQty }}×{{ item.sizeKg }}kg · {{ formatCurrency(item.cost) }}
              </span>
            </div>
          </NuxtLink>
        </div>
      </section>

      <EmptyState
        v-if="report.totalOwnCount === 0 && report.purchases.length === 0"
        title="No own cylinders in this period"
        description="Own cylinders are tracked when you mark received cylinders as 'new connection' during purchase."
      />
    </template>
  </div>
</template>
