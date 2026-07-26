<script setup lang="ts">
import { Input } from '~/components/ui/input'
import { CYLINDER_SIZES } from '~/types'
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

const initialItemBySize = new Map((props.initial?.items ?? []).map((i) => [i.sizeKg, i]))
const seededItems = CYLINDER_SIZES.map((sizeKg) => {
  const existing = initialItemBySize.get(sizeKg)
  return existing
    ? { ...existing, newConnectionQty: existing.newConnectionQty ?? 0 }
    : { sizeKg, receivedQty: 0, returnedQty: 0, newConnectionQty: 0 }
})

const form = reactive<PurchaseFormData>({
  purchaseDate: props.initial?.purchaseDate ?? toISODate(new Date()),
  totalAmount: props.initial?.totalAmount ?? 0,
  connectionCharge: props.initial?.connectionCharge ?? 0,
  amountPaid: props.initial?.amountPaid ?? 0,
  paymentMode: props.initial?.paymentMode ?? 'cash',
  dueDate: props.initial?.dueDate ?? '',
  items: seededItems,
})

const payNow = ref((props.initial?.amountPaid ?? 0) > 0)

const preview = computed(() => buildPreview(form.items))
const stockIsValid = computed(() => preview.value.every((p) => p.isValid))
const grandTotal = computed(() => (Number(form.totalAmount) || 0) + (Number(form.connectionCharge) || 0))
const formIsValid = computed(() => {
  if (!stockIsValid.value || grandTotal.value <= 0) return false
  if (payNow.value && (!form.paymentMode || Number(form.amountPaid) <= 0)) return false
  return true
})
const totalIn = computed(() => form.items.reduce((sum, i) => sum + i.receivedQty + i.newConnectionQty, 0))
const totalOut = computed(() => form.items.reduce((sum, i) => sum + i.returnedQty, 0))

onMounted(loadCurrentStock)

watch(payNow, (v) => {
  if (!v) {
    form.amountPaid = 0
  } else {
    form.amountPaid = grandTotal.value
  }
})

watch(grandTotal, (v) => {
  if (payNow.value) {
    form.amountPaid = v
  }
})

function handleSubmit() {
  if (!formIsValid.value) return
  emit('submit', {
    ...form,
    totalAmount: Number(form.totalAmount) || 0,
    connectionCharge: Number(form.connectionCharge) || 0,
    amountPaid: payNow.value ? (Number(form.amountPaid) || 0) : 0,
    paymentMode: payNow.value ? form.paymentMode : undefined,
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
          <div v-for="size in CYLINDER_SIZES" :key="size" class="flex items-center justify-between py-3 border-b border-surface-container-highest last:border-0">
            <p class="text-body-base text-on-surface">{{ size }}kg</p>
            <input
              v-model.number="form.items.find(i => i.sizeKg === size)!.receivedQty"
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
          <div v-for="size in CYLINDER_SIZES" :key="size" class="flex items-center justify-between py-3 border-b border-surface-container-highest last:border-0">
            <p class="text-body-base text-on-surface">{{ size }}kg</p>
            <input
              v-model.number="form.items.find(i => i.sizeKg === size)!.returnedQty"
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

    <!-- Part 3.5: New Connection Cylinders -->
    <section class="bg-surface-container rounded-xl p-5 border border-surface-container-highest">
      <div class="flex items-center justify-between mb-md">
        <div class="flex items-center gap-sm">
          <Icon name="new_releases" :filled="true" class="text-tertiary" />
          <h2 class="text-data-primary text-on-surface">New Connection Cylinders</h2>
        </div>
        <span class="text-data-tertiary text-on-surface-variant">Brand new — no empty goes out</span>
      </div>
      <div class="space-y-xs">
        <div v-for="size in CYLINDER_SIZES" :key="size" class="flex items-center justify-between py-3 border-b border-surface-container-highest last:border-0">
          <p class="text-body-base text-on-surface">{{ size }}kg</p>
          <input
            v-model.number="form.items.find(i => i.sizeKg === size)!.newConnectionQty"
            type="number"
            inputmode="numeric"
            min="0"
            step="1"
            class="w-20 text-center px-2 py-1.5 border border-outline-variant/50 rounded-lg bg-surface-container-highest text-on-surface text-body-base focus:outline-none focus:border-primary"
          >
        </div>
      </div>
    </section>

    <!-- Part 4: Stock Impact Preview -->
    <section class="bg-surface-container-high rounded-xl p-5 border border-outline-variant/30">
      <div class="flex items-center gap-sm mb-md">
        <Icon name="analytics" :filled="true" class="text-secondary" />
        <h2 class="text-data-primary text-on-surface">Stock Change</h2>
      </div>
      <StockPreview :preview="preview" />
      <p v-if="!stockIsValid" class="text-data-secondary text-error mt-3">Cannot return more empties than currently in stock.</p>
    </section>

    <!-- Part 5: Payment -->
    <section class="bg-surface-container rounded-xl p-5 border border-surface-container-highest">
      <div class="flex items-center gap-sm mb-lg">
        <Icon name="payments" :filled="true" class="text-primary" />
        <h2 class="text-data-primary text-on-surface">Payment</h2>
      </div>

      <div class="grid grid-cols-2 gap-md mb-md">
        <div>
          <label class="block text-data-secondary text-on-surface-variant mb-sm">Gas Amount</label>
          <Input v-model.number="form.totalAmount" type="number" min="0" step="0.01" required />
        </div>
        <div>
          <label class="block text-data-secondary text-on-surface-variant mb-sm">Connection Charge</label>
          <Input v-model.number="form.connectionCharge" type="number" min="0" step="0.01" placeholder="0" />
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
