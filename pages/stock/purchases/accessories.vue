<script setup lang="ts">
import { Button } from '~/components/ui/button'
import type { Product } from '~/types/database'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { user } = useUserSession()
if (user.value?.role !== 'admin' && user.value?.role !== 'delivery') await navigateTo('/stock')

const { fetchProducts } = usePricing()
const { createPurchase, loading, error } = usePurchases()
const { showToast } = useToast()

const products = ref<Product[]>([])
const accessories = computed(() => products.value.filter(p => p.type === 'accessory' && p.isActive))

const form = reactive({
  purchaseDate: new Date().toISOString().split('T')[0],
  totalAmount: 0,
  amountPaid: 0,
  paymentMode: 'cash' as 'cash' | 'bank',
  notes: '',
})

const payNow = ref(true)
const quantities = reactive<Record<number, number>>({})

onMounted(async () => {
  products.value = await fetchProducts()
})

function incQty(productId: number) {
  quantities[productId] = (quantities[productId] ?? 0) + 1
}

function decQty(productId: number) {
  quantities[productId] = Math.max(0, (quantities[productId] ?? 0) - 1)
}

const selectedItems = computed(() =>
  Object.entries(quantities)
    .filter(([_, qty]) => qty > 0)
    .map(([productId, qty]) => ({ productId: Number(productId), quantity: qty }))
)

const hasItems = computed(() => selectedItems.value.length > 0)
const totalQty = computed(() => selectedItems.value.reduce((sum, i) => sum + i.quantity, 0))

watch(payNow, (v) => {
  if (!v) form.amountPaid = 0
  else form.amountPaid = form.totalAmount
})

async function handleSubmit() {
  if (!hasItems.value || form.totalAmount <= 0) return
  if (payNow.value && (!form.paymentMode || form.amountPaid <= 0)) return

  const data = {
    purchaseDate: form.purchaseDate as string,
    totalAmount: form.totalAmount,
    connectionCharge: 0,
    amountPaid: payNow.value ? form.amountPaid : 0,
    paymentMode: payNow.value ? form.paymentMode : undefined,
    notes: form.notes || undefined,
    purchaseType: 'accessories' as const,
    items: selectedItems.value.map(i => ({
      sizeKg: 17 as const,
      receivedQty: 0,
      returnedQty: 0,
      newConnectionQty: 0,
      emptyNewQty: 0,
      cylinderCost: 0,
    })),
  }

  const created = await createPurchase(data)
  if (created) {
    showToast('Accessories purchase recorded')
    await navigateTo('/stock/purchases')
  }
}
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg pb-40">
    <div>
      <NuxtLink to="/stock/purchases" class="text-data-secondary text-on-surface-variant hover:text-on-surface inline-flex items-center gap-1 mb-2">
        <Icon name="arrow_back" class="text-sm" />
        Purchases
      </NuxtLink>
      <h1 class="text-headline-md text-on-surface">Accessories Purchase</h1>
      <p class="text-data-secondary text-on-surface-variant mt-1">Regulators, adapters, connectors, cooktops</p>
    </div>

    <!-- Date -->
    <section class="bg-surface-container rounded-xl p-5 border border-surface-container-highest">
      <label class="block text-data-secondary text-on-surface-variant mb-sm">Date</label>
      <input v-model="form.purchaseDate" type="date" class="block w-full px-3 py-2 border border-outline-variant/50 rounded-lg bg-surface-container-highest text-on-surface text-body-base focus:outline-none focus:border-primary">
    </section>

    <!-- Item list -->
    <section class="bg-surface-container rounded-xl p-5 border border-surface-container-highest">
      <div class="flex items-center gap-sm mb-md">
        <Icon name="inventory_2" :filled="true" class="text-primary" />
        <h2 class="text-data-primary text-on-surface">Items</h2>
        <span v-if="totalQty > 0" class="ml-auto text-data-tertiary text-on-surface-variant">{{ totalQty }} selected</span>
      </div>
      <div v-if="accessories.length === 0" class="text-data-secondary text-on-surface-variant">No accessories found.</div>
      <div v-else class="space-y-xs">
        <div
          v-for="product in accessories"
          :key="product.id"
          class="flex items-center justify-between py-3 border-b border-surface-container-highest last:border-0"
        >
          <div class="flex-1">
            <p class="text-body-base text-on-surface">{{ product.name }}</p>
            <p class="text-data-tertiary text-on-surface-variant">{{ product.unit }}</p>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="w-8 h-8 rounded-full border border-outline-variant/50 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors"
              @click="decQty(product.id)"
            >
              <Icon name="remove" class="text-sm" />
            </button>
            <input
              :value="quantities[product.id] ?? 0"
              type="number"
              inputmode="numeric"
              min="0"
              step="1"
              class="w-16 text-center px-1 py-1 border border-outline-variant/50 rounded-lg bg-surface-container-highest text-on-surface text-body-base focus:outline-none focus:border-primary"
              @input="quantities[product.id] = Math.max(0, Number(($event.target as HTMLInputElement).value) || 0)"
            >
            <button
              type="button"
              class="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center hover:opacity-90 transition-colors"
              @click="incQty(product.id)"
            >
              <Icon name="add" class="text-sm" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Amount -->
    <section class="bg-surface-container rounded-xl p-5 border border-surface-container-highest">
      <label class="block text-data-secondary text-on-surface-variant mb-sm">Total Amount (₹)</label>
      <input
        v-model.number="form.totalAmount"
        type="number"
        inputmode="numeric"
        min="1"
        step="1"
        placeholder="e.g. 2000"
        class="block w-full px-3 py-2 border border-outline-variant/50 rounded-lg bg-surface-container-highest text-on-surface text-body-base focus:outline-none focus:border-primary"
      >
    </section>

    <!-- Payment -->
    <section class="bg-surface-container rounded-xl p-5 border border-surface-container-highest">
      <div class="flex items-center gap-sm mb-md">
        <Icon name="payments" :filled="true" class="text-primary" />
        <h2 class="text-data-primary text-on-surface">Payment</h2>
      </div>

      <div class="bg-surface-container rounded-xl p-1 border border-outline-variant/30 flex mb-lg">
        <button
          type="button"
          class="flex-1 py-3 rounded-lg text-data-secondary transition-colors flex items-center justify-center gap-2"
          :class="!payNow ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant'"
          @click="payNow = false"
        >
          <Icon name="schedule" class="text-sm" /> Pay Later
        </button>
        <button
          type="button"
          class="flex-1 py-3 rounded-lg text-data-secondary transition-colors flex items-center justify-center gap-2"
          :class="payNow ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant'"
          @click="payNow = true"
        >
          <Icon name="check_circle" class="text-sm" /> Pay Now
        </button>
      </div>

      <div v-if="payNow" class="space-y-md">
        <div>
          <label class="block text-data-secondary text-on-surface-variant mb-sm">Amount Paid</label>
          <input v-model.number="form.amountPaid" type="number" min="0" step="0.01" :max="form.totalAmount" class="block w-full px-3 py-2 border border-outline-variant/50 rounded-lg bg-surface-container-highest text-on-surface text-body-base focus:outline-none focus:border-primary">
        </div>
        <div>
          <label class="block text-data-secondary text-on-surface-variant mb-3">Payment Method</label>
          <div class="flex gap-sm">
            <button type="button" class="flex-1 px-5 py-2.5 rounded-full text-data-secondary transition-all flex items-center justify-center gap-2 border" :class="form.paymentMode === 'cash' ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant text-on-surface-variant'" @click="form.paymentMode = 'cash'">
              <Icon name="payments" class="text-[18px]" /> Cash
            </button>
            <button type="button" class="flex-1 px-5 py-2.5 rounded-full text-data-secondary transition-all flex items-center justify-center gap-2 border" :class="form.paymentMode === 'bank' ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant text-on-surface-variant'" @click="form.paymentMode = 'bank'">
              <Icon name="account_balance" class="text-[18px]" /> Bank
            </button>
          </div>
        </div>
      </div>

      <div v-else class="bg-surface-container-low rounded-xl p-3 border border-outline-variant/20">
        <p class="text-data-secondary text-on-surface-variant flex items-center gap-2">
          <Icon name="info" class="text-sm" />
          Payment will be settled later.
        </p>
      </div>
    </section>

    <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

    <!-- Sticky bottom bar -->
    <div class="fixed bottom-16 inset-x-0 mx-auto max-w-[480px] bg-surface-container border-t border-outline-variant/30 px-margin-mobile py-4 z-30 flex items-center justify-between gap-4">
      <div class="flex flex-col">
        <span class="text-data-secondary text-on-surface-variant">Summary</span>
        <span class="text-data-primary text-on-surface">{{ totalQty }} items · {{ formatCurrency(form.totalAmount) }}</span>
      </div>
      <button
        type="button"
        class="bg-primary text-primary-foreground px-6 py-3 rounded-lg flex flex-col items-center justify-center active:scale-95 transition-all disabled:opacity-50"
        :disabled="loading || !hasItems || form.totalAmount <= 0 || (payNow && (!form.paymentMode || form.amountPaid <= 0))"
        @click="handleSubmit"
      >
        <span class="text-data-primary">{{ loading ? 'Saving...' : 'Save Purchase' }}</span>
        <span class="text-data-tertiary opacity-80 mt-0.5">{{ payNow ? 'Will deduct from ' + form.paymentMode : 'Pay later' }}</span>
      </button>
    </div>
  </div>
</template>
