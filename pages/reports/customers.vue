<script setup lang="ts">
import { CUSTOMER_TYPES, type CustomerType } from '~/types'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { fetchTopCustomers, dateRange, loading } = useReports()
const rows = ref<Awaited<ReturnType<typeof fetchTopCustomers>>>([])
const typeFilter = ref<CustomerType | null>(null)

async function load() {
  rows.value = await fetchTopCustomers(typeFilter.value ?? undefined)
}
watch(dateRange, load, { immediate: true })
watch(typeFilter, load)
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg">
    <h1 class="text-headline-md text-on-surface">Top Customers</h1>
    <DateRangeFilter />

    <!-- Type filter chips -->
    <div class="flex gap-1.5 overflow-x-auto no-scrollbar -mx-2 px-2">
      <button
        class="px-3 py-1.5 rounded-full text-data-secondary border whitespace-nowrap transition-colors shrink-0"
        :class="typeFilter === null
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-outline-variant/30 text-on-surface-variant'"
        @click="typeFilter = null"
      >
        All
      </button>
      <button
        v-for="t in CUSTOMER_TYPES"
        :key="t"
        class="px-3 py-1.5 rounded-full text-data-secondary border whitespace-nowrap transition-colors shrink-0 capitalize"
        :class="typeFilter === t
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-outline-variant/30 text-on-surface-variant'"
        @click="typeFilter = t"
      >
        {{ t }}
      </button>
    </div>

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
            <p class="text-data-tertiary text-on-surface-variant">{{ row.deliveryCount }} deliveries · {{ row.type }}</p>
          </div>
        </div>
        <span class="text-data-secondary" :class="index === 0 ? 'text-primary-fixed-dim' : 'text-on-surface-variant'">{{ formatCurrency(row.totalBilled) }}</span>
      </NuxtLink>
    </div>
  </div>
</template>
