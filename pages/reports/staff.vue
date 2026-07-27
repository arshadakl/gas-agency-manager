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
  activity.value = null
  expandedId.value = null
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
    <EmptyState v-else-if="rows.length === 0" title="No data in this range" />
    <div v-else class="flex flex-col gap-sm">
      <div v-for="row in rows" :key="row.createdBy" class="bg-surface-container rounded-xl overflow-hidden">
        <button class="w-full flex items-center justify-between p-4" @click="toggleStaff(row.createdBy)">
          <div class="flex items-center gap-3">
            <span class="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-highest text-data-secondary font-bold text-on-surface-variant">
              {{ initials(row.createdByName || 'U') }}
            </span>
            <div>
              <p class="text-data-primary text-on-surface">{{ row.createdByName || 'Unknown' }}</p>
              <p class="text-data-tertiary text-on-surface-variant">{{ row.deliveryCount }} deliveries</p>
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
            <Icon :name="expandedId === row.createdBy ? 'expand_less' : 'expand_more'" class="text-on-surface-variant" />
          </div>
        </button>

        <div v-if="expandedId === row.createdBy" class="border-t border-surface-container-highest p-4 space-y-md">
          <div v-if="!activity" class="flex justify-center py-4"><LoadingSpinner /></div>
          <template v-else>
            <!-- Collection summary -->
            <div v-if="row.totalCollected > 0" class="bg-surface-container-high rounded-lg p-3 space-y-1">
              <p class="text-label-caps text-on-surface-variant uppercase mb-1">Collected</p>
              <div class="flex justify-between text-data-secondary">
                <span class="text-on-surface-variant flex items-center gap-1"><Icon name="payments" class="text-[12px] text-emerald-500" /> Cash</span>
                <span class="text-on-surface">{{ formatCurrency(row.cashCollected) }}</span>
              </div>
              <div class="flex justify-between text-data-secondary">
                <span class="text-on-surface-variant flex items-center gap-1"><Icon name="account_balance" class="text-[12px] text-blue-500" /> Bank</span>
                <span class="text-on-surface">{{ formatCurrency(row.bankCollected) }}</span>
              </div>
              <div class="flex justify-between text-data-secondary border-t border-outline-variant/20 pt-1">
                <span class="text-on-surface font-medium">Total</span>
                <span class="text-on-surface font-medium">{{ formatCurrency(row.totalCollected) }}</span>
              </div>
            </div>

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
                <span class="text-on-surface-variant">
                  {{ formatDate(p.paymentDate) }}
                  <span class="inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded-full border text-[10px]"
                    :class="p.paymentMode === 'cash' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-blue-500/10 text-blue-500 border-blue-500/30'">
                    <Icon :name="p.paymentMode === 'cash' ? 'payments' : 'account_balance'" class="text-[10px]" />
                    {{ p.paymentMode }}
                  </span>
                </span>
                <span class="text-on-surface">{{ formatCurrency(p.amount) }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
