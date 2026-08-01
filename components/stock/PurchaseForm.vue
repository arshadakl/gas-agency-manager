<script setup lang="ts">
import { Input } from '~/components/ui/input'
import { CYLINDER_SIZES, type CylinderSize } from '~/types'
import type { PurchaseFormData, PurchasePaymentEntry, PurchaseLineItem } from '~/composables/usePurchases'

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

const includeOwnCylinders = ref(false)
const includeEmptyNew = ref(false)

const initialItemBySize = new Map((props.initial?.items ?? []).map((i) => [i.sizeKg, i]))
const seededItems = CYLINDER_SIZES.map((sizeKg) => {
  const existing = initialItemBySize.get(sizeKg)
  const receivedQty = existing?.receivedQty ?? 0
  const newConnectionQty = existing?.newConnectionQty ?? 0
  const totalReceived = receivedQty + newConnectionQty
  return {
    sizeKg,
    totalReceived,
    ownQty: newConnectionQty,
    returnedQty: existing?.returnedQty ?? 0,
    emptyNewQty: existing?.emptyNewQty ?? 0,
    cylinderCost: existing?.cylinderCost ?? 0,
    emptyNewCost: 0,
  }
})

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
  dueDate: props.initial?.dueDate ?? '',
  notes: props.initial?.notes ?? '',
})

// Payment rows — dynamic split payments
interface PaymentRow {
  id: number
  amount: number
  paymentMode: 'cash' | 'bank'
}

let nextRowId = 1
function makeRow(amount = 0, mode: 'cash' | 'bank' = 'cash'): PaymentRow {
  return { id: nextRowId++, amount, paymentMode: mode }
}

// Seed payment rows from initial data (editing existing purchase).
const existingPayments = props.initial?.payments ?? []
const paymentRows = ref<PaymentRow[]>(
  existingPayments.length > 0
    ? existingPayments.map((p) => makeRow(p.amount, p.paymentMode))
    : [],
)
const payNow = ref(existingPayments.length > 0)

// If editing a pay-later purchase, start with no rows.
if (!payNow.value && paymentRows.value.length === 0) {
  paymentRows.value = [makeRow(0)]
}

function addPaymentRow() {
  paymentRows.value.push(makeRow(0))
}

function removePaymentRow(rowId: number) {
  if (paymentRows.value.length <= 1) return
  paymentRows.value = paymentRows.value.filter((r) => r.id !== rowId)
}

function buildApiItems(): PurchaseLineItem[] {
  return items.map((i) => ({
    sizeKg: i.sizeKg as CylinderSize,
    receivedQty: includeOwnCylinders.value ? Math.max(0, i.totalReceived - i.ownQty) : i.totalReceived,
    returnedQty: i.returnedQty,
    newConnectionQty: includeOwnCylinders.value ? i.ownQty : 0,
    emptyNewQty: includeEmptyNew.value ? i.emptyNewQty : 0,
    cylinderCost: (includeOwnCylinders.value ? i.cylinderCost : 0) + (includeEmptyNew.value ? i.emptyNewCost : 0),
  }))
}

const preview = computed(() => buildPreview(buildApiItems()))
const stockIsValid = computed(() => preview.value.every((p) => p.isValid))

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

const connectionCharge = computed(() => {
  let total = 0
  for (const item of items) {
    if (includeOwnCylinders.value) total += item.cylinderCost
    if (includeEmptyNew.value) total += item.emptyNewCost
  }
  return total
})

const grandTotal = computed(() => (Number(form.totalAmount) || 0) + connectionCharge.value)

// Derived payment totals
const totalPaid = computed(() => paymentRows.value.reduce((sum, r) => sum + (Number(r.amount) || 0), 0))
const pendingAmount = computed(() => Math.max(0, grandTotal.value - totalPaid.value))

const formIsValid = computed(() => {
  if (!stockIsValid.value || grandTotal.value <= 0) return false
  if (hasOwnQtyErrors.value) return false
  if (payNow.value && totalPaid.value <= 0) return false
  // Payment rows must not exceed grand total
  if (totalPaid.value > grandTotal.value + 0.01) return false
  // Each row must have amount > 0
  if (payNow.value && paymentRows.value.some((r) => (Number(r.amount) || 0) <= 0)) return false
  return true
})

const totalIn = computed(() => items.reduce((sum, i) => sum + i.totalReceived + (includeEmptyNew.value ? i.emptyNewQty : 0), 0))
const totalOut = computed(() => items.reduce((sum, i) => sum + i.returnedQty, 0))

const visibleOwnSizes = computed(() => items.filter((i) => i.totalReceived > 0))

onMounted(loadCurrentStock)

// When toggling pay later, clear all rows
watch(payNow, (v) => {
  if (!v) {
    paymentRows.value = []
  } else {
    if (paymentRows.value.length === 0) {
      paymentRows.value = [makeRow(grandTotal.value)]
    }
  }
})

// Auto-fill first row amount when grand total changes (only if single row and it was auto-filled)
watch(grandTotal, (v) => {
  if (payNow.value && paymentRows.value.length === 1) {
    const row = paymentRows.value[0]
    if (row && (row.amount === 0 || row.amount >= grandTotal.value)) {
      row.amount = v
    }
  }
})

watch(includeOwnCylinders, (v) => {
  if (!v) {
    for (const item of items) {
      item.ownQty = 0
      item.cylinderCost = 0
    }
  }
})

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
  const payments: PurchasePaymentEntry[] = payNow.value
    ? paymentRows.value
        .filter((r) => (Number(r.amount) || 0) > 0)
        .map((r) => ({ amount: Number(r.amount), paymentMode: r.paymentMode }))
    : []
  emit('submit', {
    supplier: props.initial?.supplier,
    purchaseDate: form.purchaseDate,
    totalAmount: Number(form.totalAmount) || 0,
    connectionCharge: connectionCharge.value,
    payments,
    dueDate: form.dueDate || undefined,
    notes: form.notes || undefined,
    purchaseType: props.initial?.purchaseType,
    items: apiItems,
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
      <div class="m-0 p-0">
        <label class="block text-data-secondary text-on-surface-variant mb-sm">Date</label>
        <Input v-model="form.purchaseDate" type="date" class="px-0 mx-0" required/>
      </div>
    </section>

    <!-- Part 2 & 3: Cylinder quantities -->
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

    <!-- Part 4a: Own Cylinders -->
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

    <!-- Part 4b: Empty new cylinders -->
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

      <!-- Pay Now — dynamic payment rows -->
      <div v-if="payNow" class="space-y-md">
        <div v-for="(row, idx) in paymentRows" :key="row.id" class="bg-surface-container-high rounded-xl p-4 border border-outline-variant/20 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-data-secondary text-on-surface-variant">Payment {{ idx + 1 }}</span>
            <button
              v-if="paymentRows.length > 1"
              type="button"
              class="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-error-container/20 hover:text-error"
              @click="removePaymentRow(row.id)"
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
              :max="grandTotal"
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
          class="w-full py-2.5 rounded-xl border border-dashed border-outline-variant/50 text-data-secondary text-on-surface-variant flex items-center justify-center gap-1.5 hover:border-primary hover:text-primary transition-colors"
          @click="addPaymentRow"
        >
          <Icon name="add" class="text-sm" /> Add Payment
        </button>

        <!-- Totals -->
        <div class="bg-surface-container-low rounded-xl p-3 border border-outline-variant/20 space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-data-secondary text-on-surface-variant">Total Paid</span>
            <span class="text-data-primary text-on-surface">{{ formatCurrency(totalPaid) }}</span>
          </div>
          <div v-if="pendingAmount > 0" class="flex items-center justify-between">
            <span class="text-data-secondary text-on-surface-variant">Remaining (pay later)</span>
            <span class="text-data-primary text-error">{{ formatCurrency(pendingAmount) }}</span>
          </div>
        </div>
        <p v-if="totalPaid > grandTotal + 0.01" class="text-data-secondary text-error">Total payments exceed grand total</p>
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
