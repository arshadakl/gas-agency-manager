<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { hasFeature } = usePermissions()
if (!hasFeature('profit_loss')) await navigateTo('/reports')

const { fetchProfitLoss, fetchProfitLossTrend, dateRange, loading } = useReports()
const report = ref<Awaited<ReturnType<typeof fetchProfitLoss>> | null>(null)
const trend = ref<Array<{ month: string; revenue: number; costs: number; expenses: number; profit: number }>>([])
const trendLoading = ref(false)
const chartView = ref<'bar' | 'line'>('bar')

async function load() {
  const [pnl, trendData] = await Promise.all([
    fetchProfitLoss(),
    (async () => {
      trendLoading.value = true
      try { return await fetchProfitLossTrend(6) }
      finally { trendLoading.value = false }
    })(),
  ])
  report.value = pnl
  trend.value = trendData
}
watch(dateRange, load, { immediate: true })

const maxVal = computed(() => {
  if (!trend.value.length) return 1
  let m = 0
  for (const d of trend.value) {
    m = Math.max(m, Math.abs(d.revenue), Math.abs(d.costs), Math.abs(d.profit))
  }
  return m || 1
})

function barHeight(val: number) {
  return Math.max(2, (Math.abs(val) / maxVal.value) * 100)
}

function barColor(type: 'revenue' | 'costs' | 'profit', val: number) {
  if (type === 'revenue') return 'bg-tertiary-container'
  if (type === 'costs') return 'bg-primary-container'
  if (val < 0) return 'bg-red-500'
  return 'bg-emerald-500'
}

function linePoints(vals: number[]) {
  if (!vals.length) return ''
  const w = 100 / (vals.length - 1 || 1)
  return vals.map((v, i) => {
    const x = i * w
    const y = 50 - (v / maxVal.value) * 45
    return `${x},${y}`
  }).join(' ')
}

function formatMonth(m: string) {
  const [y, mon] = m.split('-')
  const d = new Date(parseInt(y!), parseInt(mon!) - 1)
  return d.toLocaleDateString('en-IN', { month: 'short' })
}

function deltaText(d: number | null) {
  if (d === null || d === undefined) return ''
  return `${d >= 0 ? '+' : ''}${d.toFixed(1)}%`
}

const expenseItems = computed(() => {
  if (!report.value) return []
  const { fuel, maintenance, fine, other } = report.value.expenses
  return [
    { label: 'Fuel', amount: fuel, icon: 'local_gas_station', color: 'text-amber-500' },
    { label: 'Maintenance', amount: maintenance, icon: 'build', color: 'text-blue-500' },
    { label: 'Fine', amount: fine, icon: 'gavel', color: 'text-red-500' },
    { label: 'Other', amount: other, icon: 'receipt', color: 'text-on-surface-variant' },
  ].filter(e => e.amount > 0)
})
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg">
    <div class="flex items-center gap-3">
      <NuxtLink to="/reports" class="p-2 -ml-2 rounded-full hover:bg-surface-container">
        <Icon name="arrow_back" class="text-on-surface-variant" />
      </NuxtLink>
      <h1 class="text-headline-md text-on-surface">Profit & Loss</h1>
    </div>
    <DateRangeFilter />

    <!-- Loading -->
    <div v-if="loading && !report" class="flex justify-center py-8">
      <LoadingSpinner />
    </div>

    <template v-else-if="report">
      <!-- KPI Row -->
      <div class="grid grid-cols-2 gap-sm">
        <KpiCard
          label="Revenue"
          :value="formatCurrency(report.revenue.totalBilled)"
          hero
        />
        <KpiCard
          label="Total Costs"
          :value="formatCurrency(report.costs.totalPurchases)"
          :delta="deltaText(report.previous.grossDelta)"
        />
        <KpiCard
          label="Net Profit"
          :value="formatCurrency(report.netProfit)"
          :delta="deltaText(report.previous.netDelta)"
        />
      </div>

      <!-- Charts -->
      <div class="bg-surface-container rounded-xl p-4 border border-outline-variant/30">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-data-primary text-on-surface font-semibold">Monthly Trend</h2>
          <div class="flex gap-1">
            <button
              class="px-2.5 py-1 rounded-lg text-data-tertiary border transition-colors"
              :class="chartView === 'bar' ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant/30 text-on-surface-variant'"
              @click="chartView = 'bar'"
            >Bars</button>
            <button
              class="px-2.5 py-1 rounded-lg text-data-tertiary border transition-colors"
              :class="chartView === 'line' ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant/30 text-on-surface-variant'"
              @click="chartView = 'line'"
            >Lines</button>
          </div>
        </div>

        <div v-if="trendLoading" class="flex justify-center py-4">
          <LoadingSpinner />
        </div>
        <div v-else-if="!trend.length" class="text-center py-4 text-data-secondary text-on-surface-variant">
          No trend data available
        </div>

        <!-- Grouped Bar Chart -->
        <div v-else-if="chartView === 'bar'" class="relative">
          <!-- Zero line -->
          <div class="absolute left-0 right-0 top-1/2 border-t border-outline-variant/30 z-0" />
          <div class="flex items-end gap-1 h-40 relative z-10">
            <div
              v-for="(d, i) in trend"
              :key="i"
              class="flex-1 flex flex-col items-center gap-0.5"
            >
              <div class="flex items-end gap-0.5 h-32 w-full justify-center">
                <div
                  class="w-3 rounded-t-sm transition-all"
                  :class="barColor('revenue', d.revenue)"
                  :style="{ height: barHeight(d.revenue) + '%' }"
                  :title="`Revenue: ${formatCurrency(d.revenue)}`"
                />
                <div
                  class="w-3 rounded-t-sm transition-all"
                  :class="barColor('costs', d.costs)"
                  :style="{ height: barHeight(d.costs) + '%' }"
                  :title="`Costs: ${formatCurrency(d.costs)}`"
                />
                <div
                  class="w-3 rounded-t-sm transition-all"
                  :class="barColor('profit', d.profit)"
                  :style="{ height: barHeight(d.profit) + '%' }"
                  :title="`Profit: ${formatCurrency(d.profit)}`"
                />
              </div>
              <span class="text-data-tertiary text-on-surface-variant">{{ formatMonth(d.month) }}</span>
            </div>
          </div>
          <!-- Legend -->
          <div class="flex items-center justify-center gap-4 mt-3">
            <span class="flex items-center gap-1.5 text-data-tertiary text-on-surface-variant">
              <span class="w-2.5 h-2.5 rounded-sm bg-tertiary-container" /> Revenue
            </span>
            <span class="flex items-center gap-1.5 text-data-tertiary text-on-surface-variant">
              <span class="w-2.5 h-2.5 rounded-sm bg-primary-container" /> Costs
            </span>
            <span class="flex items-center gap-1.5 text-data-tertiary text-on-surface-variant">
              <span class="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Profit
            </span>
          </div>
        </div>

        <!-- Line Chart -->
        <div v-else class="relative">
          <!-- Zero line -->
          <div class="absolute left-8 right-0 top-1/2 border-t border-outline-variant/30 z-0" />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="h-40 w-full relative z-10">
            <!-- Revenue line -->
            <polyline
              :points="linePoints(trend.map(d => d.revenue))"
              fill="none"
              stroke="var(--color-tertiary-container, #00a6d6)"
              stroke-width="0.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <!-- Costs line -->
            <polyline
              :points="linePoints(trend.map(d => d.costs))"
              fill="none"
              stroke="var(--color-primary-container, #ff6b2c)"
              stroke-width="0.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <!-- Profit line -->
            <polyline
              :points="linePoints(trend.map(d => d.profit))"
              fill="none"
              stroke="#10b981"
              stroke-width="0.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <!-- Dots for profit -->
            <circle
              v-for="(d, i) in trend"
              :key="'dot-' + i"
              :cx="(i * (100 / (trend.length - 1 || 1))).toString()"
              :cy="(50 - (d.profit / maxVal) * 45).toString()"
              r="1"
              :fill="d.profit < 0 ? '#ef4444' : '#10b981'"
            />
          </svg>
          <!-- X labels -->
          <div class="flex justify-between px-8 mt-1">
            <span
              v-for="(d, i) in trend"
              :key="'lbl-' + i"
              class="text-data-tertiary text-on-surface-variant"
            >{{ formatMonth(d.month) }}</span>
          </div>
          <!-- Legend -->
          <div class="flex items-center justify-center gap-4 mt-2">
            <span class="flex items-center gap-1.5 text-data-tertiary text-on-surface-variant">
              <span class="w-2.5 h-0.5 rounded bg-tertiary-container" /> Revenue
            </span>
            <span class="flex items-center gap-1.5 text-data-tertiary text-on-surface-variant">
              <span class="w-2.5 h-0.5 rounded bg-primary-container" /> Costs
            </span>
            <span class="flex items-center gap-1.5 text-data-tertiary text-on-surface-variant">
              <span class="w-2.5 h-0.5 rounded bg-emerald-500" /> Profit
            </span>
          </div>
        </div>
      </div>

      <!-- Revenue -->
      <div class="bg-surface-container rounded-xl p-4 border border-outline-variant/30">
        <h2 class="text-data-primary text-on-surface font-semibold mb-3">Revenue</h2>
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-data-secondary text-on-surface-variant">Total Billed</span>
            <span class="text-data-primary text-on-surface">{{ formatCurrency(report.revenue.totalBilled) }}</span>
          </div>
          <div class="flex items-center justify-between pl-4">
            <span class="flex items-center gap-1.5 text-data-secondary text-on-surface-variant">
              <Icon name="payments" class="text-xs text-emerald-500" /> Cash Collected
            </span>
            <span class="text-data-secondary text-emerald-500">{{ formatCurrency(report.revenue.cashCollected) }}</span>
          </div>
          <div class="flex items-center justify-between pl-4">
            <span class="flex items-center gap-1.5 text-data-secondary text-on-surface-variant">
              <Icon name="account_balance" class="text-xs text-blue-500" /> Bank Collected
            </span>
            <span class="text-data-secondary text-blue-500">{{ formatCurrency(report.revenue.bankCollected) }}</span>
          </div>
        </div>
      </div>

      <!-- Cost of Gas -->
      <div class="bg-surface-container rounded-xl p-4 border border-outline-variant/30">
        <h2 class="text-data-primary text-on-surface font-semibold mb-3">Cost of Gas</h2>
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-data-secondary text-on-surface-variant">Gas Purchases</span>
            <span class="text-data-primary text-on-surface">{{ formatCurrency(report.costs.gasPurchases) }}</span>
          </div>
          <div class="flex items-center justify-between" v-if="report.costs.connectionCharges > 0">
            <span class="text-data-secondary text-on-surface-variant">Connection Charges</span>
            <span class="text-data-secondary text-on-surface-variant">{{ formatCurrency(report.costs.connectionCharges) }}</span>
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-outline-variant/20">
            <span class="text-data-primary text-on-surface font-semibold">Total Costs</span>
            <span class="text-data-primary text-on-surface font-semibold">{{ formatCurrency(report.costs.totalPurchases) }}</span>
          </div>
        </div>
      </div>

      <!-- Operating Expenses -->
      <div class="bg-surface-container rounded-xl p-4 border border-outline-variant/30">
        <h2 class="text-data-primary text-on-surface font-semibold mb-3">Operating Expenses</h2>
        <div v-if="expenseItems.length === 0" class="text-data-secondary text-on-surface-variant text-center py-2">
          No expenses in this period
        </div>
        <div v-else class="flex flex-col gap-2">
          <div
            v-for="item in expenseItems"
            :key="item.label"
            class="flex items-center justify-between"
          >
            <span class="flex items-center gap-1.5 text-data-secondary text-on-surface-variant">
              <Icon :name="item.icon" class="text-xs" :class="item.color" />
              {{ item.label }}
            </span>
            <span class="text-data-secondary text-on-surface-variant">{{ formatCurrency(item.amount) }}</span>
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-outline-variant/20">
            <span class="text-data-primary text-on-surface font-semibold">Total Expenses</span>
            <span class="text-data-primary text-on-surface font-semibold">{{ formatCurrency(report.expenses.total) }}</span>
          </div>
        </div>
      </div>

      <!-- Owner Withdrawals -->
      <div v-if="report.withdrawals.count > 0" class="bg-surface-container rounded-xl p-4 border border-outline-variant/30">
        <h2 class="text-data-primary text-on-surface font-semibold mb-3">Owner Withdrawals</h2>
        <div class="flex items-center justify-between">
          <span class="text-data-secondary text-on-surface-variant">
            {{ report.withdrawals.count }} withdrawal{{ report.withdrawals.count > 1 ? 's' : '' }}
          </span>
          <span class="text-data-primary text-on-surface">{{ formatCurrency(report.withdrawals.total) }}</span>
        </div>
      </div>

      <!-- Net Profit -->
      <div
        class="rounded-xl p-5 border relative overflow-hidden"
        :class="report.netProfit >= 0
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : 'bg-red-500/10 border-red-500/30'"
      >
        <div class="absolute -bottom-4 -right-4 w-24 h-24 rounded-full blur-2xl"
          :class="report.netProfit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'" />
        <p class="text-data-secondary text-on-surface-variant z-10 relative">Net Profit</p>
        <p class="text-display-lg z-10 relative mt-1"
          :class="report.netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'">
          {{ formatCurrency(report.netProfit) }}
        </p>
        <p v-if="report.previous.netDelta !== null" class="text-data-tertiary text-on-surface-variant z-10 relative mt-1">
          {{ report.previous.netDelta >= 0 ? '▲' : '▼' }} {{ Math.abs(report.previous.netDelta).toFixed(1) }}% vs previous period
        </p>
      </div>
    </template>
  </div>
</template>
