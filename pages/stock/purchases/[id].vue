<script setup lang="ts">
import { Button } from '~/components/ui/button'
import type { PurchaseWithItems, PurchaseFormData } from '~/composables/usePurchases'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { user } = useUserSession()
const route = useRoute()
const id = Number(route.params.id)

const { fetchPurchase, updatePurchase, deletePurchase, loading, error } = usePurchases()
const purchase = ref<PurchaseWithItems | null>(null)
const editing = ref(false)

onMounted(async () => {
  purchase.value = await fetchPurchase(id)
})

const initialFormData = computed<Partial<PurchaseFormData> | undefined>(() => {
  if (!purchase.value) return undefined
  const p = purchase.value
  return {
    supplier: p.supplier,
    purchaseDate: p.purchaseDate,
    invoiceNo: p.invoiceNo ?? undefined,
    totalAmount: p.totalAmount,
    amountPaid: p.amountPaid,
    paymentMode: p.paymentMode ?? undefined,
    paymentReference: p.paymentReference ?? undefined,
    dueDate: p.dueDate ?? undefined,
    notes: p.notes ?? undefined,
    items: p.items.map((i) => ({
      sizeKg: i.sizeKg as 12 | 17 | 33,
      receivedQty: i.receivedQty,
      returnedQty: i.returnedQty,
      unitPrice: i.unitPrice ?? undefined,
    })),
  }
})

const paymentIcons: Record<string, string> = { cash: 'account_balance_wallet', upi: 'qr_code_scanner', bank: 'account_balance', credit: 'credit_card' }
const totalReceived = computed(() => purchase.value?.items.reduce((sum, i) => sum + i.receivedQty, 0) ?? 0)
const totalReturned = computed(() => purchase.value?.items.reduce((sum, i) => sum + i.returnedQty, 0) ?? 0)

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

async function handleSubmit(data: PurchaseFormData) {
  const updated = await updatePurchase(id, data)
  if (updated) {
    purchase.value = updated
    editing.value = false
  }
}

async function handleDelete() {
  const ok = await deletePurchase(id)
  if (ok) await navigateTo('/stock/purchases')
}
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg">
    <div v-if="loading && !purchase" class="flex justify-center py-12">
      <LoadingSpinner />
    </div>

    <template v-else-if="purchase">
      <template v-if="!editing">
        <div class="flex flex-col gap-xs">
          <h1 class="text-headline-md text-on-surface">{{ purchase.invoiceNo ? `Purchase #${purchase.invoiceNo}` : purchase.supplier }}</h1>
          <div class="flex items-center gap-sm text-on-surface-variant text-data-secondary flex-wrap">
            <span class="flex items-center gap-1"><Icon name="business" class="text-base" /> {{ purchase.supplier }}</span>
            <span>·</span>
            <span class="flex items-center gap-1"><Icon name="calendar_today" class="text-base" /> {{ formatDate(purchase.purchaseDate) }}</span>
          </div>
        </div>

        <!-- Overview Card -->
        <section class="bg-surface-container rounded-xl p-5 border border-surface-container-highest grid grid-cols-1 sm:grid-cols-3 gap-md">
          <div class="flex flex-col gap-xs">
            <span class="text-label-caps text-on-surface-variant uppercase">Total Amount</span>
            <span class="text-headline-md text-primary-fixed-dim">{{ formatCurrency(purchase.totalAmount) }}</span>
          </div>
          <div class="flex flex-col gap-xs">
            <span class="text-label-caps text-on-surface-variant uppercase">Payment Type</span>
            <div class="flex items-center gap-sm">
              <span class="w-8 h-8 rounded bg-surface-container-high flex items-center justify-center text-on-surface">
                <Icon :name="(purchase.paymentMode && paymentIcons[purchase.paymentMode]) || 'help'" class="text-[18px]" />
              </span>
              <span class="text-data-primary text-on-surface capitalize">{{ purchase.paymentMode ?? '—' }}</span>
            </div>
          </div>
          <div class="flex flex-col gap-xs">
            <span class="text-label-caps text-on-surface-variant uppercase">Added By</span>
            <div class="flex items-center gap-sm">
              <span class="flex h-8 w-8 items-center justify-center rounded-full bg-surface-variant border border-outline-variant text-[10px] font-bold text-on-surface-variant">
                {{ initials(purchase.createdByName) }}
              </span>
              <span class="text-data-primary text-on-surface">{{ purchase.createdByName }}</span>
            </div>
          </div>
        </section>

        <!-- Exchange Details -->
        <section class="bg-surface-container rounded-xl p-5 border border-surface-container-highest">
          <h2 class="text-data-primary text-on-surface mb-md flex items-center gap-sm">
            <Icon name="swap_horiz" class="text-primary" /> Cylinders In & Out
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-md">
            <div>
              <div class="flex items-center justify-between mb-sm pb-sm border-b border-surface-variant">
                <span class="text-label-caps text-tertiary uppercase flex items-center gap-1">
                  <Icon name="arrow_downward" class="text-[14px]" /> Received (Full)
                </span>
                <span class="text-data-primary text-tertiary">{{ totalReceived }}</span>
              </div>
              <ul class="flex flex-col gap-xs">
                <li v-for="item in purchase.items.filter((i) => i.receivedQty > 0)" :key="`r-${item.sizeKg}`" class="flex justify-between items-center py-1">
                  <span class="text-data-secondary text-on-surface-variant">{{ item.sizeKg }}kg</span>
                  <span class="text-data-secondary text-on-surface">{{ item.receivedQty }}</span>
                </li>
              </ul>
            </div>
            <div class="sm:border-l sm:pl-md border-surface-variant">
              <div class="flex items-center justify-between mb-sm pb-sm border-b border-surface-variant">
                <span class="text-label-caps text-primary-fixed-dim uppercase flex items-center gap-1">
                  <Icon name="arrow_upward" class="text-[14px]" /> Returned (Empty)
                </span>
                <span class="text-data-primary text-primary-fixed-dim">{{ totalReturned }}</span>
              </div>
              <ul class="flex flex-col gap-xs">
                <li v-for="item in purchase.items.filter((i) => i.returnedQty > 0)" :key="`e-${item.sizeKg}`" class="flex justify-between items-center py-1">
                  <span class="text-data-secondary text-on-surface-variant">{{ item.sizeKg }}kg</span>
                  <span class="text-data-secondary text-on-surface">{{ item.returnedQty }}</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <p v-if="purchase.notes" class="text-data-secondary text-on-surface-variant">{{ purchase.notes }}</p>

        <div v-if="user?.role === 'admin' || user?.role === 'delivery'" class="flex flex-col sm:flex-row gap-sm justify-end">
          <Button variant="outline" class="rounded-lg border-error text-error hover:bg-error/10" @click="handleDelete">
            <Icon name="delete" class="text-lg mr-2" /> Delete Record
          </Button>
          <Button class="rounded-lg" @click="editing = true">
            <Icon name="edit" class="text-lg mr-2" /> Edit Details
          </Button>
        </div>
      </template>

      <PurchaseForm
        v-else
        :initial="initialFormData"
        :loading="loading"
        :error="error"
        @submit="handleSubmit"
        @cancel="editing = false"
      />
    </template>
  </div>
</template>
