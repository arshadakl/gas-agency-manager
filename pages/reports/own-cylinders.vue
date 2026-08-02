<script setup lang="ts">
import { CYLINDER_SIZES } from '~/types'
import type { CylinderSize } from '~/types'

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
const { showToast } = useToast()

// ── Add own cylinders ──────────────────────────────────────────────
const showOwnForm = ref(false)
const ownSize = ref<CylinderSize>(17)
const ownCount = ref<number>(1)
const ownAmount = ref<number>(0)
const ownDebit = ref(false)
const ownPaymentSource = ref<'cash' | 'bank'>('cash')
const ownSubmitting = ref(false)

async function handleAddOwn() {
  if (ownCount.value < 1 || ownAmount.value < 0) return
  ownSubmitting.value = true
  try {
    await $fetch('/api/inventory/own-cylinders', {
      method: 'POST',
      body: {
        sizeKg: ownSize.value,
        count: ownCount.value,
        amount: ownAmount.value,
        debitFromAccount: ownDebit.value,
        paymentSource: ownPaymentSource.value,
      },
    })
    showToast(`${ownCount.value} × ${ownSize.value}kg own cylinders added`)
    showOwnForm.value = false
    ownCount.value = 1
    ownAmount.value = 0
    ownDebit.value = false
    ownPaymentSource.value = 'cash'
    await load()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : (e as { data?: { message?: string } })?.data?.message || 'Failed to add'
    showToast(msg, 'destructive')
  } finally {
    ownSubmitting.value = false
  }
}

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

    <!-- Add own cylinders -->
    <div class="bg-surface-container rounded-xl p-4 border border-outline-variant/20">
      <div class="flex items-center justify-between mb-3">
        <span class="text-data-primary text-on-surface flex items-center gap-2">
          <Icon name="add_circle" class="text-primary-fixed-dim" /> Add Own Cylinders
        </span>
        <button
          v-if="!showOwnForm"
          class="rounded-full bg-primary-container px-3 py-1 text-label-caps text-on-primary-container font-semibold hover:opacity-90"
          @click="showOwnForm = true"
        >+ Add</button>
      </div>

      <div v-if="showOwnForm" class="space-y-3">
        <div>
          <label class="text-label-caps text-on-surface-variant mb-1 block">Size</label>
          <div class="flex gap-2">
            <button
              v-for="size in CYLINDER_SIZES"
              :key="size"
              class="flex-1 rounded-lg py-2 text-data-secondary border transition-colors"
              :class="ownSize === size ? 'bg-primary-container text-on-primary-container border-primary-container' : 'bg-surface-container-high text-on-surface-variant border-outline-variant/20'"
              @click="ownSize = size"
            >{{ size }}kg</button>
          </div>
        </div>
        <div class="flex gap-3">
          <div class="flex-1">
            <label class="text-label-caps text-on-surface-variant mb-1 block">Count</label>
            <input v-model.number="ownCount" type="number" min="1" class="w-full rounded-lg bg-surface-container-highest px-3 py-2 text-data-primary text-on-surface border border-outline-variant/20 outline-none focus:border-primary-container" />
          </div>
          <div class="flex-1">
            <label class="text-label-caps text-on-surface-variant mb-1 block">Amount (₹)</label>
            <input v-model.number="ownAmount" type="number" min="0" class="w-full rounded-lg bg-surface-container-highest px-3 py-2 text-data-primary text-on-surface border border-outline-variant/20 outline-none focus:border-primary-container" />
          </div>
        </div>
        <!-- Debit from account -->
        <label class="flex items-center gap-3 cursor-pointer">
          <div class="relative">
            <input v-model="ownDebit" type="checkbox" class="peer sr-only" />
            <div class="w-10 h-5 rounded-full bg-surface-container-highest border border-outline-variant/30 peer-checked:bg-primary-container transition-colors" />
            <div class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-on-surface-variant peer-checked:translate-x-5 peer-checked:bg-on-primary-container transition-all" />
          </div>
          <span class="text-data-secondary text-on-surface-variant">Debit from account</span>
        </label>
        <div v-if="ownDebit" class="flex gap-2">
          <button
            class="flex-1 rounded-lg py-2 text-data-secondary border transition-colors"
            :class="ownPaymentSource === 'cash' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-surface-container-high text-on-surface-variant border-outline-variant/20'"
            @click="ownPaymentSource = 'cash'"
          >Cash</button>
          <button
            class="flex-1 rounded-lg py-2 text-data-secondary border transition-colors"
            :class="ownPaymentSource === 'bank' ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' : 'bg-surface-container-high text-on-surface-variant border-outline-variant/20'"
            @click="ownPaymentSource = 'bank'"
          >Bank</button>
        </div>
        <div class="flex gap-2">
          <button class="flex-1 rounded-xl border border-outline-variant/40 py-2.5 text-body-base text-on-surface-variant hover:bg-surface-variant transition-colors" @click="showOwnForm = false">Cancel</button>
          <button class="flex-1 rounded-xl bg-primary-container text-on-primary-container py-2.5 text-body-base font-semibold hover:opacity-90 transition-opacity disabled:opacity-50" :disabled="ownSubmitting || ownCount < 1" @click="handleAddOwn">
            <LoadingSpinner v-if="ownSubmitting" class="h-4 w-4 mx-auto" />
            <span v-else>Add</span>
          </button>
        </div>
      </div>
    </div>

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
            :to="`/stock/purchases/${p.publicId}`"
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
