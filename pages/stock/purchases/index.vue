<script setup lang="ts">
import { Button } from '~/components/ui/button'
import type { Purchase } from '~/types/database'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { user } = useUserSession()
const { fetchPurchases, clearPurchase, loading } = usePurchases()
const { showToast } = useToast()

const purchases = ref<Purchase[]>([])
const tab = ref<'gas' | 'accessories'>('gas')
const clearingId = ref<string | null>(null)
const clearAmount = ref<number>(0)
const clearMode = ref<'cash' | 'bank'>('cash')
const pageSize = 5
const visibleCount = ref(pageSize)

onMounted(async () => {
  purchases.value = await fetchPurchases()
})

const filteredPurchases = computed(() =>
  purchases.value.filter(p => (p.purchaseType ?? 'gas') === tab.value)
)

const visiblePurchases = computed(() => filteredPurchases.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < filteredPurchases.value.length)

function loadMore() {
  visibleCount.value += pageSize
}

watch(tab, () => {
  visibleCount.value = pageSize
})

const totalTrips = computed(() => filteredPurchases.value.length)
const totalSpent = computed(() => filteredPurchases.value.reduce((sum, p) => sum + p.totalAmount + (p.connectionCharge ?? 0), 0))

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

function startClear(p: Purchase) {
  clearingId.value = p.publicId
  const grandTotal = p.totalAmount + (p.connectionCharge ?? 0)
  clearAmount.value = Math.round((grandTotal - p.amountPaid) * 100) / 100
  clearMode.value = 'cash'
}

async function handleClear() {
  if (!clearingId.value || clearAmount.value <= 0) return
  const result = await clearPurchase(clearingId.value, { amount: clearAmount.value, paymentMode: clearMode.value })
  if (result) {
    showToast(`₹${clearAmount.value.toLocaleString()} payment recorded`)
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

    <!-- Clear payment dialog -->
    <div v-if="clearingId" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div class="bg-surface-container rounded-2xl p-6 w-full max-w-sm border border-outline-variant/30">
        <h3 class="text-headline-md text-on-surface mb-4">Clear Payment</h3>
        <div class="space-y-4">
          <div>
            <label class="text-data-secondary text-on-surface-variant">Amount</label>
            <input v-model.number="clearAmount" type="number" inputmode="numeric" min="0.01" step="0.01" class="block w-full px-3 py-2 border border-outline-variant/50 rounded-lg bg-surface-container-highest text-on-surface text-body-base focus:outline-none focus:border-primary mt-1">
          </div>
          <div>
            <label class="text-data-secondary text-on-surface-variant mb-2 block">Payment Method</label>
            <div class="flex gap-2">
              <button type="button" class="flex-1 px-4 py-2.5 rounded-full text-data-secondary border transition-colors" :class="clearMode === 'cash' ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant text-on-surface-variant'" @click="clearMode = 'cash'">
                <Icon name="payments" class="text-sm mr-1" /> Cash
              </button>
              <button type="button" class="flex-1 px-4 py-2.5 rounded-full text-data-secondary border transition-colors" :class="clearMode === 'bank' ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant text-on-surface-variant'" @click="clearMode = 'bank'">
                <Icon name="account_balance" class="text-sm mr-1" /> Bank
              </button>
            </div>
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <Button variant="outline" class="flex-1" @click="clearingId = null">Cancel</Button>
          <Button class="flex-1" :disabled="loading || clearAmount <= 0" @click="handleClear">
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
