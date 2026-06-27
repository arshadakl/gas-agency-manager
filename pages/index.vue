<script setup lang="ts">
import { Button } from '~/components/ui/button'
import type { DeliveryWithRelations, CylinderStock } from '~/types/database'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { user } = useUserSession()
const { t } = useLocale()
const { fetchToday } = useDeliveries()
const { fetchSummary } = useReports()
const { fetchCylinderStock } = useInventory()
const { fetchTodayPayments } = usePayments()
const { fetchOrders } = useOrders()

const todayDeliveries = ref<DeliveryWithRelations[]>([])
const collectedToday = ref(0)
const pendingTotal = ref(0)
const pendingOrderCount = ref(0)
const cylinderStock = ref<CylinderStock[]>([])
const loading = ref(true)

onMounted(async () => {
  const [deliveries, summary, stock, todayPayments, orders] = await Promise.all([
    fetchToday(),
    user.value?.role !== 'viewer' ? fetchSummary() : Promise.resolve(null),
    fetchCylinderStock(),
    fetchTodayPayments(),
    fetchOrders('pending'),
  ])
  todayDeliveries.value = deliveries
  pendingTotal.value = summary?.outstanding ?? 0
  cylinderStock.value = stock
  collectedToday.value = todayPayments.reduce((sum, p) => sum + p.amount, 0)
  pendingOrderCount.value = orders.length
  loading.value = false
})

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg pb-40">
    <div class="flex items-center justify-between">
      <h2 class="text-headline-md text-on-surface">{{ t('hi') }}, {{ user?.fullName }}</h2>
      <Button v-if="user?.role !== 'viewer'" size="sm" class="rounded-full" as-child>
        <NuxtLink to="/deliveries/new"><Icon name="add" class="text-base mr-1" /> {{ t('new_delivery') }}</NuxtLink>
      </Button>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <LoadingSpinner />
    </div>
    <template v-else>
      <section aria-label="Key Performance Indicators" class="grid grid-cols-2 gap-sm items-stretch">
        <NuxtLink to="/deliveries?today=true" class="block h-full">
          <KpiCard :label="t('today_deliveries')" :value="String(todayDeliveries.length)" />
        </NuxtLink>
        <NuxtLink to="/payments/today" class="block h-full">
          <KpiCard :label="t('today_collected')" :value="formatCurrency(collectedToday)" />
        </NuxtLink>
        <NuxtLink v-if="user?.role !== 'viewer'" to="/customers?filter=outstanding" class="block h-full">
          <KpiCard :label="t('total_pending')" :value="formatCurrency(pendingTotal)" />
        </NuxtLink>
        <NuxtLink to="/orders" class="block h-full">
          <KpiCard :label="t('orders')" :value="String(pendingOrderCount)" />
        </NuxtLink>
      </section>

      <NuxtLink
        to="/payments"
        class="flex items-center justify-between rounded-xl bg-surface-container p-4 border border-outline-variant/20 hover:border-outline-variant/40 transition-colors"
      >
        <div class="flex items-center gap-3">
          <Icon name="receipt_long" class="text-primary-fixed-dim" />
          <span class="text-data-secondary text-on-surface">{{ t('all_payments') }}</span>
        </div>
        <Icon name="chevron_right" class="text-on-surface-variant" />
      </NuxtLink>

      <section aria-labelledby="stock-heading">
        <div class="flex items-center justify-between mb-sm">
          <h2 id="stock-heading" class="text-data-primary text-on-surface">{{ t('cylinder_stock') }}</h2>
          <NuxtLink to="/stock" class="text-data-tertiary text-primary-fixed-dim hover:underline flex items-center">
            {{ t('view_details') }} <Icon name="chevron_right" class="text-xs ml-1" />
          </NuxtLink>
        </div>
        <CylinderStockCard :stock="cylinderStock" />
      </section>

      <NuxtLink
        v-if="user?.role === 'admin' || user?.role === 'delivery'"
        to="/stock/purchases/new"
        class="w-full bg-surface-container border border-primary-container/60 rounded-xl p-4 flex items-center justify-between group hover:bg-primary-container/5 transition-all active:scale-[0.98]"
      >
        <div class="flex items-center gap-3">
          <div class="bg-primary-container/20 p-2 rounded-full text-primary-fixed-dim flex items-center justify-center">
            <Icon name="add" class="text-lg" />
          </div>
          <span class="text-data-secondary text-primary-fixed-dim">{{ t('record_purchase') }}</span>
        </div>
        <Icon name="arrow_forward" class="text-primary-fixed-dim group-hover:translate-x-1 transition-transform" />
      </NuxtLink>

      <section aria-labelledby="delivery-heading">
        <h2 id="delivery-heading" class="text-data-primary text-on-surface mb-sm">{{ t('active_deliveries') }}</h2>
        <EmptyState v-if="todayDeliveries.length === 0" :title="t('no_deliveries_today')" />
        <div v-else class="flex flex-col gap-sm">
          <NuxtLink
            v-for="delivery in todayDeliveries"
            :key="delivery.id"
            :to="`/deliveries/${delivery.id}`"
            class="bg-surface-container p-4 rounded-xl border border-outline-variant/30 flex flex-col gap-3 relative overflow-hidden"
          >
            <div class="absolute top-0 left-0 w-1 h-full bg-tertiary-container" />
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-data-primary text-on-surface">{{ delivery.customer.name }}</h3>
                <p v-if="delivery.customer.contactPerson" class="text-data-secondary text-on-surface-variant">{{ delivery.customer.contactPerson }}</p>
              </div>
              <span class="text-data-primary text-on-surface">{{ formatCurrency(delivery.totalAmount) }}</span>
            </div>
            <div class="bg-surface-container-highest inline-flex items-center gap-2 px-2 py-1.5 rounded-full border border-outline-variant/50 self-start">
              <span class="flex h-5 w-5 items-center justify-center rounded-full bg-secondary-container text-[9px] font-bold text-on-secondary-container">
                {{ initials(delivery.createdByName) }}
              </span>
              <span class="text-data-tertiary text-on-surface">{{ t('delivered_by') }} {{ delivery.createdByName }}</span>
            </div>
          </NuxtLink>
        </div>
      </section>
    </template>
  </div>
</template>
