<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const route = useRoute()
const userId = Number(route.params.userId)
const { fetchStaff, fetchStaffActivity, dateRange, loading } = useReports()
const staff = ref<{ createdBy: number; createdByName: string; deliveryCount: number; totalValue: number; cashCollected: number; bankCollected: number; totalCollected: number; paymentCount: number } | null>(null)
const activity = ref<Awaited<ReturnType<typeof fetchStaffActivity>> | null>(null)
const activeTab = ref<'deliveries' | 'payments' | 'orders'>('deliveries')

async function load() {
  const [rows, act] = await Promise.all([
    fetchStaff(),
    fetchStaffActivity(userId),
  ])
  staff.value = rows.find(r => r.createdBy === userId) ?? null
  activity.value = act
}
watch(dateRange, load, { immediate: true })

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

const tabs = [
  { key: 'deliveries' as const, label: 'Deliveries', icon: 'local_shipping' },
  { key: 'payments' as const, label: 'Payments', icon: 'payments' },
  { key: 'orders' as const, label: 'Orders', icon: 'receipt_long' },
]
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <NuxtLink to="/reports/staff" class="p-2 -ml-2 rounded-full hover:bg-surface-container">
        <Icon name="arrow_back" class="text-on-surface-variant" />
      </NuxtLink>
      <div class="flex items-center gap-3">
        <span class="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-highest text-data-secondary font-bold text-on-surface-variant">
          {{ initials(staff?.createdByName || 'U') }}
        </span>
        <div>
          <h1 class="text-headline-md text-on-surface">{{ staff?.createdByName || 'Staff' }}</h1>
          <p v-if="staff" class="text-data-tertiary text-on-surface-variant">
            {{ staff.deliveryCount }} deliveries · {{ formatCurrency(staff.totalCollected) }} collected
          </p>
        </div>
      </div>
    </div>

    <DateRangeFilter />

    <!-- Summary cards -->
    <div v-if="staff" class="grid grid-cols-2 gap-sm">
      <div class="bg-surface-container rounded-xl p-3 border border-outline-variant/30 text-center">
        <p class="text-data-tertiary text-on-surface-variant">Deliveries</p>
        <p class="text-data-primary text-on-surface font-semibold mt-1">{{ staff.deliveryCount }}</p>
      </div>
      <div class="bg-surface-container rounded-xl p-3 border border-outline-variant/30 text-center">
        <p class="text-data-tertiary text-on-surface-variant">Collected</p>
        <p class="text-data-primary text-on-surface font-semibold mt-1">{{ formatCurrency(staff.totalCollected) }}</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 bg-surface-container rounded-xl p-1">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-data-secondary transition-colors"
        :class="activeTab === tab.key
          ? 'bg-primary-container text-on-primary-container font-semibold'
          : 'text-on-surface-variant'"
        @click="activeTab = tab.key"
      >
        <Icon :name="tab.icon" class="text-sm" />
        {{ tab.label }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading && !activity" class="flex justify-center py-8">
      <LoadingSpinner />
    </div>

    <!-- Deliveries Tab -->
    <template v-else-if="activity && activeTab === 'deliveries'">
      <EmptyState v-if="activity.deliveries.length === 0" title="No deliveries" description="No deliveries in this period." />
      <div v-else class="flex flex-col gap-sm">
        <div
          v-for="d in activity.deliveries"
          :key="d.id"
          class="bg-surface-container rounded-xl p-4 border border-outline-variant/30"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <p class="text-data-primary text-on-surface truncate">{{ d.customerName }}</p>
              <p class="text-data-tertiary text-on-surface-variant mt-0.5">{{ formatDate(d.deliveryDate) }}</p>
            </div>
            <span class="text-data-primary text-on-surface font-semibold shrink-0 ml-3">
              {{ formatCurrency(d.totalAmount) }}
            </span>
          </div>
          <div class="flex items-center gap-2 mt-2">
            <span
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border"
              :class="d.status === 'delivered'
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                : d.status === 'cancelled'
                  ? 'bg-red-500/10 text-red-500 border-red-500/30'
                  : 'bg-amber-500/10 text-amber-500 border-amber-500/30'"
            >
              {{ d.status }}
            </span>
            <span
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border"
              :class="d.paymentStatus === 'paid'
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                : d.paymentStatus === 'partial'
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                  : 'bg-red-500/10 text-red-500 border-red-500/30'"
            >
              {{ d.paymentStatus }}
            </span>
          </div>
          <p v-if="d.notes" class="text-data-tertiary text-on-surface-variant mt-2">{{ d.notes }}</p>
        </div>
      </div>
    </template>

    <!-- Payments Tab -->
    <template v-else-if="activity && activeTab === 'payments'">
      <EmptyState v-if="activity.payments.length === 0" title="No payments" description="No payments in this period." />
      <div v-else class="flex flex-col gap-sm">
        <div
          v-for="p in activity.payments"
          :key="p.id"
          class="bg-surface-container rounded-xl p-4 border border-outline-variant/30"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <p class="text-data-primary text-on-surface truncate">{{ p.customerName }}</p>
              <p class="text-data-tertiary text-on-surface-variant mt-0.5">{{ formatDate(p.paymentDate) }}</p>
            </div>
            <span class="text-data-primary text-emerald-500 font-semibold shrink-0 ml-3">
              +{{ formatCurrency(p.amount) }}
            </span>
          </div>
          <div class="mt-2">
            <span
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border"
              :class="p.paymentMode === 'cash'
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                : 'bg-blue-500/10 text-blue-500 border-blue-500/30'"
            >
              <Icon :name="p.paymentMode === 'cash' ? 'payments' : 'account_balance'" class="text-[10px]" />
              {{ p.paymentMode }}
            </span>
          </div>
          <p v-if="p.notes" class="text-data-tertiary text-on-surface-variant mt-2">{{ p.notes }}</p>
        </div>
      </div>
    </template>

    <!-- Orders Tab -->
    <template v-else-if="activity && activeTab === 'orders'">
      <EmptyState v-if="activity.orders.length === 0" title="No orders" description="No orders in this period." />
      <div v-else class="flex flex-col gap-sm">
        <div
          v-for="o in activity.orders"
          :key="o.id"
          class="bg-surface-container rounded-xl p-4 border border-outline-variant/30"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <p class="text-data-primary text-on-surface">{{ formatDate(o.orderDate) }}</p>
            </div>
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize"
              :class="o.status === 'delivered'
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                : o.status === 'cancelled'
                  ? 'bg-red-500/10 text-red-500 border-red-500/30'
                  : 'bg-amber-500/10 text-amber-500 border-amber-500/30'"
            >
              {{ o.status }}
            </span>
          </div>
          <p v-if="o.notes" class="text-data-tertiary text-on-surface-variant mt-2">{{ o.notes }}</p>
        </div>
      </div>
    </template>
  </div>
</template>
