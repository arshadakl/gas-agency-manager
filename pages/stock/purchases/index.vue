<script setup lang="ts">
import { Button } from '~/components/ui/button'
import type { Purchase } from '~/types/database'
import type { PurchasePaymentEntry } from '~/composables/usePurchases'
import { type ClearPaymentRow, makeClearRow } from '~/utils/clearPayment'
import { initials } from '~/utils/formatters'
import { getPresetRange, type DatePreset } from '~/utils/datePresets'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { user } = useUserSession()
const { fetchPurchases, clearPurchase, loading } = usePurchases()
const { showToast } = useToast()

const purchases = ref<Purchase[]>([])
const tab = ref<'gas' | 'accessories'>('gas')
const statusFilter = ref<'all' | 'pending' | 'paid' | 'partial'>('all')
const clearingId = ref<string | null>(null)
const pageSize = 5
const visibleCount = ref(pageSize)

// Date filter
const datePreset = ref<DatePreset>('this_month')
const customFrom = ref('')
const customTo = ref('')
const dateRange = computed(() =>
  datePreset.value === 'custom'
    ? { from: customFrom.value, to: customTo.value }
    : getPresetRange(datePreset.value),
)

// Split clear state
const clearRows = ref<ClearPaymentRow[]>([makeClearRow()])
const clearPendingAmount = ref(0)

onMounted(async () => {
  purchases.value = await fetchPurchases()
})

const filteredPurchases = computed(() => {
  return purchases.value.filter(p => {
    if ((p.purchaseType ?? 'gas') !== tab.value) return false
    if (statusFilter.value !== 'all' && p.paymentStatus !== statusFilter.value) return false
    if (dateRange.value.from && p.purchaseDate < dateRange.value.from) return false
    if (dateRange.value.to && p.purchaseDate > dateRange.value.to) return false
    return true
  })
})

const visiblePurchases = computed(() => filteredPurchases.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < filteredPurchases.value.length)

function loadMore() {
  visibleCount.value += pageSize
}

watch(tab, () => {
  visibleCount.value = pageSize
})

watch([statusFilter, dateRange], () => {
  visibleCount.value = pageSize
})

const totalTrips = computed(() => filteredPurchases.value.length)
const totalSpent = computed(() => filteredPurchases.value.reduce((sum, p) => sum + p.totalAmount + (p.connectionCharge ?? 0), 0))


function startClear(p: Purchase) {
  clearingId.value = p.publicId
  const grandTotal = p.totalAmount + (p.connectionCharge ?? 0)
  const pending = Math.round((grandTotal - p.amountPaid) * 100) / 100
  clearPendingAmount.value = pending
  clearRows.value = [makeClearRow(pending)]
}

const clearTotalPaid = computed(() => clearRows.value.reduce((sum, r) => sum + (Number(r.amount) || 0), 0))
const clearIsValid = computed(() => clearTotalPaid.value > 0 && clearTotalPaid.value <= clearPendingAmount.value + 0.01)

function addClearRow() {
  clearRows.value.push(makeClearRow())
}

function removeClearRow(rowId: number) {
  if (clearRows.value.length <= 1) return
  clearRows.value = clearRows.value.filter((r) => r.id !== rowId)
}

async function handleClear() {
  if (!clearingId.value || !clearIsValid.value) return
  const payments: PurchasePaymentEntry[] = clearRows.value
    .filter((r) => (Number(r.amount) || 0) > 0)
    .map((r) => ({ amount: Number(r.amount), paymentMode: r.paymentMode }))
  const result = await clearPurchase(clearingId.value, { payments })
  if (result) {
    showToast(`${formatCurrency(clearTotalPaid.value)} payment recorded`)
    clearingId.value = null
    purchases.value = await fetchPurchases()
  }
}
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg">
    <div class="flex items-center justify-between">
      <div>
        <NuxtLink to="/stock" class="text-data-secondary text-on-surface-variant hover:text-on-surface inline-flex items-center gap-1 mb-1">
          <Icon name="arrow_back" class="text-sm" />
          Stock
        </NuxtLink>
        <h1 class="text-headline-md text-on-surface">Purchases</h1>
      </div>
      <div v-if="user?.role === 'admin' || user?.role === 'delivery'" class="flex gap-2">
        <NuxtLink to="/stock/purchases/accessories" class="px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface text-data-secondary border border-outline-variant/30 flex items-center gap-1">
          <Icon name="inventory_2" class="text-sm" /> Accessories
        </NuxtLink>
        <NuxtLink to="/stock/purchases/new" class="px-3 py-1.5 rounded-full bg-primary-container text-on-primary-container text-data-secondary flex items-center gap-1">
          <Icon name="add" class="text-sm" /> Gas
        </NuxtLink>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex bg-surface-container rounded-full p-1 border border-outline-variant/20">
      <button
        class="flex-1 py-2.5 rounded-full text-data-secondary font-medium transition-all flex items-center justify-center gap-1.5"
        :class="tab === 'gas' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant'"
        @click="tab = 'gas'"
      >
        <Icon name="local_shipping" class="text-base" />
        Gas Purchases
      </button>
      <button
        class="flex-1 py-2.5 rounded-full text-data-secondary font-medium transition-all flex items-center justify-center gap-1.5"
        :class="tab === 'accessories' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant'"
        @click="tab = 'accessories'"
      >
        <Icon name="inventory_2" class="text-base" />
        Accessories
      </button>
    </div>

    <!-- Payment status filter -->
    <div class="flex gap-sm overflow-x-auto pb-1">
      <button
        v-for="s in (['all', 'pending', 'paid', 'partial'] as const)"
        :key="s"
        class="shrink-0 rounded-full px-4 py-2 text-data-secondary whitespace-nowrap transition-colors border"
        :class="statusFilter === s ? 'bg-primary-container text-on-primary-container font-bold border-primary-container' : 'border-outline text-on-surface-variant'"
        @click="statusFilter = s"
      >
        {{ s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1) }}
      </button>
    </div>

    <!-- Date filter -->
    <div class="flex gap-sm overflow-x-auto pb-1">
      <button
        v-for="p in (['today', 'this_week', 'this_month', '3_months', '6_months', 'custom'] as const)"
        :key="p"
        class="shrink-0 rounded-full px-4 py-2 text-data-secondary whitespace-nowrap transition-colors border"
        :class="datePreset === p ? 'bg-surface-container-high text-on-surface font-bold border-outline-variant/30' : 'border-outline text-on-surface-variant'"
        @click="datePreset = p"
      >
        {{ p === 'today' ? 'Today' : p === 'this_week' ? 'This Week' : p === 'this_month' ? 'This Month' : p === '3_months' ? '3 Months' : p === '6_months' ? '6 Months' : 'Custom' }}
      </button>
    </div>
    <div v-if="datePreset === 'custom'" class="flex items-end gap-3">
      <div class="flex-1 min-w-0">
        <label class="text-data-tertiary text-on-surface-variant text-xs block mb-1">From</label>
        <input v-model="customFrom" type="date" class="w-full rounded-lg border border-outline-variant bg-surface-container-highest px-0 py-2 text-body-base text-on-surface" />
      </div>
      <div class="flex-1 min-w-0">
        <label class="text-data-tertiary text-on-surface-variant text-xs block mb-1">To</label>
        <input v-model="customTo" type="date" class="w-full rounded-lg border border-outline-variant bg-surface-container-highest px-0 py-2 text-body-base text-on-surface" />
      </div>
    </div>

    <!-- Summary -->
    <section v-if="filteredPurchases.length > 0" class="grid grid-cols-2 gap-sm">
      <div class="bg-surface-container rounded-xl p-md flex flex-col justify-center">
        <span class="text-label-caps text-on-surface-variant mb-xs">PURCHASES</span>
        <span class="text-headline-md text-on-surface">{{ totalTrips }} <span class="text-data-secondary text-on-surface-variant ml-xs">trips</span></span>
      </div>
      <div class="bg-surface-container rounded-xl p-md flex flex-col justify-center">
        <span class="text-label-caps text-on-surface-variant mb-xs">SPENT</span>
        <span class="text-headline-md text-primary-fixed-dim">{{ formatCurrency(totalSpent) }}</span>
      </div>
    </section>

    <!-- Split Clear payment dialog -->
    <div v-if="clearingId" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div class="bg-surface-container rounded-2xl p-6 w-full max-w-sm border border-outline-variant/30 space-y-4">
        <h3 class="text-headline-md text-on-surface">Clear Payment</h3>
        <p class="text-data-secondary text-on-surface-variant">Split between Cash and Bank if needed.</p>

        <div v-for="(row, idx) in clearRows" :key="row.id" class="bg-surface-container-high rounded-xl p-4 border border-outline-variant/20 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-data-secondary text-on-surface-variant">Payment {{ idx + 1 }}</span>
            <button
              v-if="clearRows.length > 1"
              type="button"
              class="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-error-container/20 hover:text-error"
              @click="removeClearRow(row.id)"
            >
              <Icon name="close" class="text-sm" />
            </button>
          </div>
          <div>
            <label class="text-data-tertiary text-on-surface-variant mb-1 block">Amount</label>
            <input
              v-model.number="row.amount"
              type="number"
              inputmode="numeric"
              min="0.01"
              step="0.01"
              class="w-full px-3 py-2 border border-outline-variant/50 rounded-lg bg-surface-container-highest text-on-surface text-body-base focus:outline-none focus:border-primary"
            >
          </div>
          <div>
            <label class="text-data-tertiary text-on-surface-variant mb-2 block">From</label>
            <div class="flex gap-2">
              <button
                type="button"
                class="flex-1 px-4 py-2.5 rounded-full text-data-secondary border transition-colors"
                :class="row.paymentMode === 'cash' ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant text-on-surface-variant'"
                @click="row.paymentMode = 'cash'"
              >
                <Icon name="payments" class="text-sm mr-1" /> Cash
              </button>
              <button
                type="button"
                class="flex-1 px-4 py-2.5 rounded-full text-data-secondary border transition-colors"
                :class="row.paymentMode === 'bank' ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant text-on-surface-variant'"
                @click="row.paymentMode = 'bank'"
              >
                <Icon name="account_balance" class="text-sm mr-1" /> Bank
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="w-full py-2 rounded-xl border border-dashed border-outline-variant/50 text-data-secondary text-on-surface-variant flex items-center justify-center gap-1.5"
          @click="addClearRow"
        >
          <Icon name="add" class="text-sm" /> Add Payment
        </button>

        <div class="bg-surface-container-low rounded-xl p-3 border border-outline-variant/20 space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-data-secondary text-on-surface-variant">Paying now</span>
            <span class="text-data-primary text-on-surface">{{ formatCurrency(clearTotalPaid) }}</span>
          </div>
          <div v-if="clearPendingAmount - clearTotalPaid > 0" class="flex items-center justify-between">
            <span class="text-data-secondary text-on-surface-variant">Still pending</span>
            <span class="text-data-primary text-error">{{ formatCurrency(clearPendingAmount - clearTotalPaid) }}</span>
          </div>
        </div>

        <div class="flex gap-3">
          <Button variant="outline" class="flex-1" @click="clearingId = null">Cancel</Button>
          <Button class="flex-1" :disabled="loading || !clearIsValid" @click="handleClear">
            <LoadingSpinner v-if="loading" class="h-4 w-4 mr-2" />
            Confirm
          </Button>
        </div>
      </div>
    </div>

    <!-- Purchase list -->
    <div v-if="loading && purchases.length === 0" class="flex justify-center py-12">
      <LoadingSpinner />
    </div>
    <EmptyState v-else-if="filteredPurchases.length === 0" :title="tab === 'gas' ? 'No gas purchases yet' : 'No accessories purchases yet'" description="Record a purchase to get started." />
    <template v-else>
      <div class="flex flex-col gap-md">
        <NuxtLink
          v-for="p in visiblePurchases"
          :key="p.id"
          :to="`/stock/purchases/${p.publicId}`"
          class="bg-surface-container rounded-xl p-md flex flex-col gap-md border border-outline-variant/20"
        >
          <div class="flex justify-between items-start">
            <div class="flex flex-col">
              <span class="text-data-primary text-on-surface flex items-center gap-sm">
                <Icon :name="p.purchaseType === 'accessories' ? 'inventory_2' : 'local_shipping'" class="text-[18px] text-on-surface-variant" />
                {{ p.supplier }}
              </span>
              <span class="text-data-secondary text-on-surface-variant mt-xs">{{ formatDate(p.purchaseDate) }}<span v-if="p.invoiceNo"> · {{ p.invoiceNo }}</span></span>
            </div>
            <div class="flex flex-col items-end">
              <span class="text-data-primary text-on-surface">{{ formatCurrency(p.totalAmount + (p.connectionCharge ?? 0)) }}</span>
              <div
                class="rounded-full px-2 py-0.5 mt-sm flex items-center gap-xs border"
                :class="p.paymentStatus === 'paid' ? 'bg-tertiary-container/20 border-tertiary-container/30' : 'bg-error-container/20 border-error-container/30'"
              >
                <div class="w-1.5 h-1.5 rounded-full" :class="p.paymentStatus === 'paid' ? 'bg-tertiary' : 'bg-error'" />
                <span class="text-label-caps" :class="p.paymentStatus === 'paid' ? 'text-tertiary' : 'text-error'">{{ p.paymentStatus.toUpperCase() }}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center justify-between pt-sm border-t border-surface-variant">
            <div class="flex items-center gap-sm">
              <span class="flex h-6 w-6 items-center justify-center rounded-full bg-surface-variant text-[9px] font-bold text-on-surface-variant">
                {{ initials(p.createdByName) }}
              </span>
              <span class="text-data-tertiary text-on-surface-variant">Added by {{ p.createdByName }}</span>
            </div>
            <button
              v-if="p.paymentStatus !== 'paid' && (user?.role === 'admin' || user?.role === 'delivery')"
              class="px-3 py-1.5 rounded-full bg-primary-container text-on-primary-container text-data-secondary flex items-center gap-1"
              @click.prevent="startClear(p)"
            >
              <Icon name="check" class="text-xs" /> Clear
            </button>
          </div>
        </NuxtLink>
      </div>
      <button
        v-if="hasMore"
        class="w-full py-3 rounded-xl border border-outline-variant/30 text-data-secondary text-on-surface-variant flex items-center justify-center gap-1.5 hover:bg-surface-container transition-colors"
        @click="loadMore"
      >
        <Icon name="expand_more" class="text-base" />
        Load more ({{ filteredPurchases.length - visibleCount }} remaining)
      </button>
    </template>
  </div>
</template>
