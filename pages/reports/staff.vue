<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { fetchStaff, fetchStaffActivity, dateRange, loading } = useReports()
const rows = ref<Awaited<ReturnType<typeof fetchStaff>>>([])
const expandedId = ref<number | null>(null)
const activity = ref<Awaited<ReturnType<typeof fetchStaffActivity>> | null>(null)

async function load() {
  rows.value = await fetchStaff()
}
watch(dateRange, load, { immediate: true })

async function toggleStaff(userId: number) {
  if (expandedId.value === userId) {
    expandedId.value = null
    activity.value = null
    return
  }
  expandedId.value = userId
  activity.value = await fetchStaffActivity(userId)
}

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
    <EmptyState v-else-if="rows.length === 0" title="No deliveries in this range" />
    <div v-else class="flex flex-col gap-sm">
      <div v-for="row in rows" :key="row.createdBy" class="bg-surface-container rounded-xl overflow-hidden">
        <button class="w-full flex items-center justify-between p-4" @click="toggleStaff(row.createdBy)">
          <div class="flex items-center gap-3">
            <span class="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-highest text-data-secondary font-bold text-on-surface-variant">
              {{ initials(row.createdByName) }}
            </span>
            <p class="text-data-primary text-on-surface">{{ row.createdByName }}</p>
          </div>
          <div class="flex items-center gap-2">
            <div class="text-right">
              <span class="text-data-primary text-on-surface">{{ row.deliveryCount }}</span>
              <p class="text-data-tertiary text-on-surface-variant">Deliveries</p>
            </div>
            <Icon :name="expandedId === row.createdBy ? 'expand_less' : 'expand_more'" class="text-on-surface-variant" />
          </div>
        </button>

        <div v-if="expandedId === row.createdBy" class="border-t border-surface-container-highest p-4 space-y-md">
          <div v-if="!activity" class="flex justify-center py-4"><LoadingSpinner /></div>
          <template v-else>
            <div>
              <p class="text-label-caps text-on-surface-variant uppercase mb-2">Deliveries ({{ activity.deliveries.length }})</p>
              <div v-for="d in activity.deliveries" :key="`d-${d.id}`" class="flex justify-between text-data-secondary py-1">
                <span class="text-on-surface-variant">{{ formatDate(d.deliveryDate) }}</span>
                <span class="text-on-surface">{{ formatCurrency(d.totalAmount) }}</span>
              </div>
            </div>
            <div>
              <p class="text-label-caps text-on-surface-variant uppercase mb-2">Orders Booked ({{ activity.orders.length }})</p>
              <div v-for="o in activity.orders" :key="`o-${o.id}`" class="flex justify-between text-data-secondary py-1">
                <span class="text-on-surface-variant">{{ formatDate(o.orderDate) }}</span>
                <span class="text-on-surface capitalize">{{ o.status }}</span>
              </div>
            </div>
            <div>
              <p class="text-label-caps text-on-surface-variant uppercase mb-2">Payments Collected ({{ activity.payments.length }})</p>
              <div v-for="p in activity.payments" :key="`p-${p.id}`" class="flex justify-between text-data-secondary py-1">
                <span class="text-on-surface-variant">{{ formatDate(p.paymentDate) }} · {{ p.paymentMode }}</span>
                <span class="text-on-surface">{{ formatCurrency(p.amount) }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
