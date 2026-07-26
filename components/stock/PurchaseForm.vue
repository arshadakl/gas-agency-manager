<script setup lang="ts">
import { Input } from '~/components/ui/input'
import { CYLINDER_SIZES, type CylinderSize } from '~/types'
import type { PurchaseFormData } from '~/composables/usePurchases'

const props = defineProps<{
  initial?: Partial<PurchaseFormData>
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  submit: [data: PurchaseFormData]
  cancel: []
}>()

const { loadCurrentStock, buildPreview } = usePurchaseForm()

// Form-level state for the "total received" view (user sees total, DB stores receivedQty + newConnectionQty separately).
const includeOwnCylinders = ref(false)
const includeEmptyNew = ref(false)

const initialItemBySize = new Map((props.initial?.items ?? []).map((i) => [i.sizeKg, i]))
const seededItems = CYLINDER_SIZES.map((sizeKg) => {
  const existing = initialItemBySize.get(sizeKg)
  const receivedQty = existing?.receivedQty ?? 0
  const newConnectionQty = existing?.newConnectionQty ?? 0
  // When editing, the stored receivedQty is the REFILL portion. The total the user saw was receivedQty + newConnectionQty.
  const totalReceived = receivedQty + newConnectionQty
  return {
    sizeKg,
    totalReceived,       // what the user sees in "Full Received"
    ownQty: newConnectionQty,  // how many are own cylinders
    returnedQty: existing?.returnedQty ?? 0,
    emptyNewQty: existing?.emptyNewQty ?? 0,
    cylinderCost: existing?.cylinderCost ?? 0,
    emptyNewCost: 0,     // separate cost for empty new (tracked at size level)
  }
})

// Detect if editing an existing purchase that had own cylinders.
if (seededItems.some((i) => i.ownQty > 0)) includeOwnCylinders.value = true
if (seededItems.some((i) => i.emptyNewQty > 0)) includeEmptyNew.value = true

interface FormItem {
  sizeKg: CylinderSize
  totalReceived: number
  ownQty: number
  returnedQty: number
  emptyNewQty: number
  cylinderCost: number
  emptyNewCost: number
}

const items = reactive<FormItem[]>(seededItems)

const form = reactive({
  purchaseDate: props.initial?.purchaseDate ?? toISODate(new Date()),
  totalAmount: props.initial?.totalAmount ?? 0,
  amountPaid: props.initial?.amountPaid ?? 0,
  paymentMode: props.initial?.paymentMode ?? 'cash',
  dueDate: props.initial?.dueDate ?? '',
})

const payNow = ref((props.initial?.amountPaid ?? 0) > 0)

// Build items in the format the API expects (receivedQty = refill only).
function buildApiItems() {
  return items.map((i) => ({
    sizeKg: i.sizeKg,
    receivedQty: includeOwnCylinders.value ? Math.max(0, i.totalReceived - i.ownQty) : i.totalReceived,
    returnedQty: i.returnedQty,
    newConnectionQty: includeOwnCylinders.value ? i.ownQty : 0,
    emptyNewQty: includeEmptyNew.value ? i.emptyNewQty : 0,
    cylinderCost: (includeOwnCylinders.value ? i.cylinderCost : 0) + (includeEmptyNew.value ? i.emptyNewCost : 0),
  }))
}

// Preview uses the API-format items.
const preview = computed(() => buildPreview(buildApiItems()))
const stockIsValid = computed(() => preview.value.every((p) => p.isValid))

// Per-size validation: ownQty ≤ totalReceived.
const ownQtyErrors = computed(() => {
  if (!includeOwnCylinders.value) return {} as Record<number, string>
  const errors: Record<number, string> = {}
  for (const item of items) {
    if (item.ownQty > item.totalReceived) {
      errors[item.sizeKg] = `Can't exceed ${item.totalReceived}`
    }
  }
  return errors
})
const hasOwnQtyErrors = computed(() => Object.keys(ownQtyErrors.value).length > 0)

// Auto-calculate connectionCharge from cylinderCosts.
const connectionCharge = computed(() => {
  let total = 0
  for (const item of items) {
    if (includeOwnCylinders.value) total += item.cylinderCost
    if (includeEmptyNew.value) total += item.emptyNewCost
  }
  return total
})

const grandTotal = computed(() => (Number(form.totalAmount) || 0) + connectionCharge.value)

const formIsValid = computed(() => {
  if (!stockIsValid.value || grandTotal.value <= 0) return false
  if (hasOwnQtyErrors.value) return false
  if (payNow.value && (!form.paymentMode || Number(form.amountPaid) <= 0)) return false
  return true
})

const totalIn = computed(() => items.reduce((sum, i) => sum + i.totalReceived + (includeEmptyNew.value ? i.emptyNewQty : 0), 0))
const totalOut = computed(() => items.reduce((sum, i) => sum + i.returnedQty, 0))

// Show own cylinder inputs only for sizes with received > 0.
const visibleOwnSizes = computed(() => items.filter((i) => i.totalReceived > 0))

onMounted(loadCurrentStock)

watch(payNow, (v) => {
  if (!v) form.amountPaid = 0
  else form.amountPaid = grandTotal.value
})

watch(grandTotal, (v) => {
  if (payNow.value) form.amountPaid = v
})

// Reset ownQty when unchecking the own cylinders checkbox.
watch(includeOwnCylinders, (v) => {
  if (!v) {
    for (const item of items) {
      item.ownQty = 0
      item.cylinderCost = 0
    }
  }
})

// Reset emptyNewQty when unchecking the empty new checkbox.
watch(includeEmptyNew, (v) => {
  if (!v) {
    for (const item of items) {
      item.emptyNewQty = 0
      item.emptyNewCost = 0
    }
  }
})

function handleSubmit() {
  if (!formIsValid.value) return
  const apiItems = buildApiItems()
  emit('submit', {
    ...form,
    totalAmount: Number(form.totalAmount) || 0,
    connectionCharge: connectionCharge.value,
    amountPaid: payNow.value ? (Number(form.amountPaid) || 0) : 0,
    paymentMode: payNow.value ? form.paymentMode : undefined,
    items: apiItems as any,
  })
}
</script>

<template>
  <form class="space-y-lg pb-40" @submit.prevent="handleSubmit">
    <!-- Part 1: Basic Details -->
    <section class="bg-surface-container rounded-xl p-5 border border-surface-container-highest">
      <div class="flex items-center gap-sm mb-md">
        <Icon name="storefront" :filled="true" class="text-primary" />
        <h2 class="text-data-primary text-on-surface">Purchase Details</h2>
      </div>
      <div>
        <label class="block text-data-secondary text-on-surface-variant mb-sm">Date</label>
        <Input v-model="form.purchaseDate" type="date" required />
      </div>
    </section>

    <!-- Part 2 & 3: Cylinder quantities (Full Received + Empties Returned) -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-lg">
      <section class="bg-surface-container rounded-xl p-5 border border-surface-container-highest">
        <div class="flex items-center justify-between mb-md">
          <div class="flex items-center gap-sm">
            <Icon name="arrow_downward" :filled="true" class="text-tertiary" />
            <h2 class="text-data-primary text-on-surface">Full Received</h2>
          </div>
          <span class="text-data-tertiary text-tertiary">Adds to stock</span>
        </div>
        <div class="space-y-xs">
          <div v-for="item in items" :key="item.sizeKg" class="flex items-center justify-between py-3 border-b border-surface-container-highest last:border-0">
            <p class="text-body-base text-on-surface">{{ item.sizeKg }}kg</p>
            <input
              v-model.number="item.totalReceived"
              type="number"
              inputmode="numeric"
              min="0"
              step="1"
              class="w-20 text-center px-2 py-1.5 border border-outline-variant/50 rounded-lg bg-surface-container-highest text-on-surface text-body-base focus:outline-none focus:border-primary"
            >
          </div>
        </div>
      </section>

      <section class="bg-surface-container rounded-xl p-5 border border-surface-container-highest">
        <div class="flex items-center justify-between mb-md">
          <div class="flex items-center gap-sm">
            <Icon name="arrow_upward" :filled="true" class="text-primary-fixed-dim" />
            <h2 class="text-data-primary text-on-surface">Empties Returned</h2>
          </div>
          <span class="text-data-tertiary text-primary-fixed-dim">Reduces empty stock</span>
        </div>
        <div class="space-y-xs">
          <div v-for="item in items" :key="item.sizeKg" class="flex items-center justify-between py-3 border-b border-surface-container-highest last:border-0">
            <p class="text-body-base text-on-surface">{{ item.sizeKg }}kg</p>
            <input
              v-model.number="item.returnedQty"
              type="number"
              inputmode="numeric"
              min="0"
              step="1"
              class="w-20 text-center px-2 py-1.5 border border-outline-variant/50 rounded-lg bg-surface-container-highest text-on-surface text-body-base focus:outline-none focus:border-primary"
            >
          </div>
        </div>
      </section>
    </div>

    <!-- Part 4a: Own Cylinders (new connection) -->
    <section class="bg-surface-container rounded-xl p-5 border border-surface-container-highest">
      <label class="flex items-center gap-3 cursor-pointer mb-0" :class="includeOwnCylinders && 'mb-md'">
        <input v-model="includeOwnCylinders" type="checkbox" class="w-5 h-5 rounded border-outline-variant text-primary-container focus:ring-primary accent-primary-container">
        <div class="flex items-center gap-sm">
          <Icon name="new_releases" :filled="true" class="text-tertiary" />
          <h2 class="text-data-primary text-on-surface">New cylinders included</h2>
        </div>
      </label>
      <p v-if="!includeOwnCylinders" class="text-data-tertiary text-on-surface-variant mt-1">Check if some received cylinders are your own property (new connections).</p>

      <div v-if="includeOwnCylinders" class="space-y-md mt-sm">
        <p class="text-data-secondary text-on-surface-variant">How many of the received cylinders are own? (must not exceed received count)</p>
        <div v-for="item in visibleOwnSizes" :key="item.sizeKg" class="space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-body-base text-on-surface">{{ item.sizeKg }}kg <span class="text-data-tertiary text-on-surface-variant">of {{ item.totalReceived }}</span></span>
            <div class="flex items-center gap-2">
              <input
                v-model.number="item.ownQty"
                type="number"
                inputmode="numeric"
                min="0"
                :max="item.totalReceived"
                step="1"
                class="w-16 text-center px-2 py-1.5 border rounded-lg bg-surface-container-highest text-on-surface text-body-base focus:outline-none focus:border-primary"
                :class="ownQtyErrors[item.sizeKg] ? 'border-error' : 'border-outline-variant/50'"
              >
              <span class="text-data-tertiary text-on-surface-variant">pcs</span>
            </div>
          </div>
          <div v-if="item.ownQty > 0" class="flex items-center gap-2">
            <span class="text-data-tertiary text-on-surface-variant">Cost ₹</span>
            <input
              v-model.number="item.cylinderCost"
              type="number"
              inputmode="numeric"
              min="0"
              step="1"
              class="w-24 px-2 py-1 border border-outline-variant/50 rounded-lg bg-surface-container-highest text-on-surface text-body-base focus:outline-none focus:border-primary"
            >
          </div>
          <p v-if="ownQtyErrors[item.sizeKg]" class="text-data-tertiary text-error">{{ ownQtyErrors[item.sizeKg] }}</p>
        </div>
        <div v-if="connectionCharge > 0" class="flex items-center justify-between pt-2 border-t border-outline-variant/20">
          <span class="text-data-secondary text-on-surface-variant">Cylinder Cost</span>
          <span class="text-data-primary text-primary-fixed-dim">{{ formatCurrency(connectionCharge) }}</span>
        </div>
      </div>
    </section>

    <!-- Part 4b: Empty new cylinders (brand new, no gas) -->
    <section class="bg-surface-container rounded-xl p-5 border border-surface-container-highest">
      <label class="flex items-center gap-3 cursor-pointer mb-0" :class="includeEmptyNew && 'mb-md'">
        <input v-model="includeEmptyNew" type="checkbox" class="w-5 h-5 rounded border-outline-variant text-primary-container focus:ring-primary accent-primary-container">
        <div class="flex items-center gap-sm">
          <Icon name="inventory_2" :filled="true" class="text-primary-fixed-dim" />
          <h2 class="text-data-primary text-on-surface">Empty new cylinders (brand new, no gas)</h2>
        </div>
      </label>
      <p v-if="!includeEmptyNew" class="text-data-tertiary text-on-surface-variant mt-1">Check if purchasing brand-new empty cylinders without gas.</p>

      <div v-if="includeEmptyNew" class="space-y-sm mt-sm">
        <p class="text-data-secondary text-on-surface-variant">No validation — these don't come from "Full Received".</p>
        <div v-for="item in items" :key="item.sizeKg" class="flex items-center justify-between py-2 border-b border-surface-container-highest last:border-0">
          <span class="text-body-base text-on-surface">{{ item.sizeKg }}kg</span>
          <div class="flex items-center gap-2">
            <input
              v-model.number="item.emptyNewQty"
              type="number"
              inputmode="numeric"
              min="0"
              step="1"
              class="w-16 text-center px-2 py-1.5 border border-outline-variant/50 rounded-lg bg-surface-container-highest text-on-surface text-body-base focus:outline-none focus:border-primary"
            >
            <span class="text-data-tertiary text-on-surface-variant">pcs</span>
            <span v-if="item.emptyNewQty > 0" class="text-data-tertiary text-on-surface-variant">₹</span>
            <input
              v-if="item.emptyNewQty > 0"
              v-model.number="item.emptyNewCost"
              type="number"
              inputmode="numeric"
              min="0"
              step="1"
              class="w-24 px-2 py-1 border border-outline-variant/50 rounded-lg bg-surface-container-highest text-on-surface text-body-base focus:outline-none focus:border-primary"
            >
          </div>
        </div>
      </div>
    </section>

    <!-- Part 5: Stock Impact Preview -->
    <section class="bg-surface-container-high rounded-xl p-5 border border-outline-variant/30">
      <div class="flex items-center gap-sm mb-md">
        <Icon name="analytics" :filled="true" class="text-secondary" />
        <h2 class="text-data-primary text-on-surface">Stock Change</h2>
      </div>
      <StockPreview :preview="preview" />
      <p v-if="!stockIsValid" class="text-data-secondary text-error mt-3">Cannot return more empties than currently in stock.</p>
    </section>

    <!-- Part 6: Payment -->
    <section class="bg-surface-container rounded-xl p-5 border border-surface-container-highest">
      <div class="flex items-center gap-sm mb-lg">
        <Icon name="payments" :filled="true" class="text-primary" />
        <h2 class="text-data-primary text-on-surface">Payment</h2>
      </div>

      <div class="grid grid-cols-1 gap-md mb-md">
        <div>
          <label class="block text-data-secondary text-on-surface-variant mb-sm">Gas Amount</label>
          <Input v-model.number="form.totalAmount" type="number" min="0" step="0.01" required />
        </div>
        <div v-if="connectionCharge > 0" class="flex items-center justify-between py-3 border-b border-outline-variant/20">
          <span class="text-data-secondary text-on-surface-variant">Cylinder Cost (auto)</span>
          <span class="text-data-primary text-primary-fixed-dim">{{ formatCurrency(connectionCharge) }}</span>
        </div>
      </div>

      <div class="pb-3 mb-lg border-b border-outline-variant/30">
        <p class="text-data-secondary text-on-surface-variant">Grand Total</p>
        <p class="text-headline-md text-primary-fixed-dim">{{ formatCurrency(grandTotal) }}</p>
      </div>

      <!-- Pay Now / Pay Later toggle -->
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

      <!-- Pay Now details -->
      <div v-if="payNow" class="space-y-md">
        <div>
          <label class="block text-data-secondary text-on-surface-variant mb-sm">Amount Paid</label>
          <Input v-model.number="form.amountPaid" type="number" min="0" step="0.01" :max="grandTotal" required />
        </div>
        <div>
          <label class="block text-data-secondary text-on-surface-variant mb-3">Payment Method</label>
          <div class="flex gap-sm">
            <button
              type="button"
              class="flex-1 px-5 py-2.5 rounded-full text-data-secondary transition-all flex items-center justify-center gap-2 border"
              :class="form.paymentMode === 'cash' ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant text-on-surface-variant'"
              @click="form.paymentMode = 'cash'"
            >
              <Icon name="payments" class="text-[18px]" /> Cash
            </button>
            <button
              type="button"
              class="flex-1 px-5 py-2.5 rounded-full text-data-secondary transition-all flex items-center justify-center gap-2 border"
              :class="form.paymentMode === 'bank' ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant text-on-surface-variant'"
              @click="form.paymentMode = 'bank'"
            >
              <Icon name="account_balance" class="text-[18px]" /> Bank
            </button>
          </div>
        </div>
      </div>

      <div v-else class="bg-surface-container-low rounded-xl p-3 border border-outline-variant/20">
        <p class="text-data-secondary text-on-surface-variant flex items-center gap-2">
          <Icon name="info" class="text-sm" />
          Amount will be paid later. You can clear this purchase when payment is made.
        </p>
      </div>
    </section>

    <p v-if="props.error" class="text-data-secondary text-error">{{ props.error }}</p>

    <!-- Sticky Bottom Footer -->
    <div class="fixed bottom-16 inset-x-0 mx-auto max-w-[480px] bg-surface-container border-t border-outline-variant/30 px-margin-mobile py-4 z-30 flex items-center justify-between gap-4">
      <div class="flex flex-col">
        <span class="text-data-secondary text-on-surface-variant">Summary</span>
        <span class="text-data-primary text-on-surface">{{ totalIn }} in · {{ totalOut }} out · {{ formatCurrency(grandTotal) }}</span>
      </div>
      <button
        type="submit"
        class="bg-primary text-primary-foreground px-6 py-3 rounded-lg flex flex-col items-center justify-center active:scale-95 transition-all disabled:opacity-50"
        :disabled="props.loading || !formIsValid"
      >
        <span class="text-data-primary">{{ props.loading ? 'Saving...' : 'Confirm Purchase' }}</span>
        <span class="text-data-tertiary opacity-80 mt-0.5">Stock will update immediately</span>
      </button>
    </div>
    <button type="button" class="block mx-auto text-data-secondary text-on-surface-variant underline mt-2" @click="emit('cancel')">Cancel</button>
  </form>
</template>
