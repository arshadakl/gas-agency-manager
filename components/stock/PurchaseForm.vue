<script setup lang="ts">
import { Input } from '~/components/ui/input'
import { CYLINDER_SIZES, PURCHASE_PAYMENT_MODES } from '~/types'
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

// Always seed every cylinder size regardless of what the original purchase
// had — editing a purchase that only ever touched, say, 17kg must not crash
// when the template iterates CYLINDER_SIZES and expects every size present.
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

const preview = computed(() => buildPreview(form.items))
const stockIsValid = computed(() => preview.value.every((p) => p.isValid))
const grandTotal = computed(() => (Number(form.totalAmount) || 0) + (Number(form.connectionCharge) || 0))
const formIsValid = computed(() => stockIsValid.value && grandTotal.value > 0)
const totalIn = computed(() => form.items.reduce((sum, i) => sum + i.receivedQty + i.newConnectionQty, 0))
const totalOut = computed(() => form.items.reduce((sum, i) => sum + i.returnedQty, 0))

onMounted(loadCurrentStock)

function itemFor(sizeKg: number) {
  return form.items.find((i) => i.sizeKg === sizeKg)!
}

function incReceived(sizeKg: number) { itemFor(sizeKg).receivedQty++ }
function decReceived(sizeKg: number) { itemFor(sizeKg).receivedQty = Math.max(0, itemFor(sizeKg).receivedQty - 1) }
function incReturned(sizeKg: number) { itemFor(sizeKg).returnedQty++ }
function decReturned(sizeKg: number) { itemFor(sizeKg).returnedQty = Math.max(0, itemFor(sizeKg).returnedQty - 1) }
function incNewConnection(sizeKg: number) { itemFor(sizeKg).newConnectionQty++ }
function decNewConnection(sizeKg: number) { itemFor(sizeKg).newConnectionQty = Math.max(0, itemFor(sizeKg).newConnectionQty - 1) }

const paymentIcons: Record<string, string> = { cash: 'account_balance_wallet', upi: 'qr_code_scanner', bank: 'account_balance', credit: 'credit_card' }

function handleSubmit() {
  if (!formIsValid.value) return
  // Cleared number inputs become '' with v-model.number — coerce to 0 so the
  // server's zod schema never sees a string.
  emit('submit', {
    ...form,
    totalAmount: Number(form.totalAmount) || 0,
    connectionCharge: Number(form.connectionCharge) || 0,
    amountPaid: Number(form.amountPaid) || 0,
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
      <div class="space-y-md">
        <div>
          <label class="block text-data-secondary text-on-surface-variant mb-sm">Date</label>
          <Input v-model="form.purchaseDate" type="date" required />
        </div>
      </div>
    </section>

    <!-- Part 2 & 3 -->
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
            <div class="flex items-center gap-4 bg-surface-container-highest rounded-lg p-1 border border-outline-variant">
              <button type="button" class="w-8 h-8 flex items-center justify-center rounded text-on-surface hover:bg-surface-variant transition-colors" @click="decReceived(size)">
                <Icon name="remove" />
              </button>
              <span class="text-data-primary text-on-surface w-6 text-center">{{ itemFor(size).receivedQty }}</span>
              <button type="button" class="w-8 h-8 flex items-center justify-center rounded text-on-surface hover:bg-surface-variant transition-colors" @click="incReceived(size)">
                <Icon name="add" />
              </button>
            </div>
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
            <div class="flex items-center gap-4 bg-surface-container-highest rounded-lg p-1 border border-outline-variant">
              <button type="button" class="w-8 h-8 flex items-center justify-center rounded text-on-surface hover:bg-surface-variant transition-colors" @click="decReturned(size)">
                <Icon name="remove" />
              </button>
              <span class="text-data-primary text-on-surface w-6 text-center">{{ itemFor(size).returnedQty }}</span>
              <button type="button" class="w-8 h-8 flex items-center justify-center rounded text-on-surface hover:bg-surface-variant transition-colors" @click="incReturned(size)">
                <Icon name="add" />
              </button>
            </div>
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
          <div class="flex items-center gap-4 bg-surface-container-highest rounded-lg p-1 border border-outline-variant">
            <button type="button" class="w-8 h-8 flex items-center justify-center rounded text-on-surface hover:bg-surface-variant transition-colors" @click="decNewConnection(size)">
              <Icon name="remove" />
            </button>
            <span class="text-data-primary text-on-surface w-6 text-center">{{ itemFor(size).newConnectionQty }}</span>
            <button type="button" class="w-8 h-8 flex items-center justify-center rounded text-on-surface hover:bg-surface-variant transition-colors" @click="incNewConnection(size)">
              <Icon name="add" />
            </button>
          </div>
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
        <h2 class="text-data-primary text-on-surface">Payment Details</h2>
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
      <div class="grid grid-cols-2 gap-md mb-lg items-end">
        <div>
          <label class="block text-data-secondary text-on-surface-variant mb-sm">Amount Paid</label>
          <Input v-model.number="form.amountPaid" type="number" min="0" step="0.01" required />
        </div>
        <div class="pb-1">
          <p class="text-data-secondary text-on-surface-variant">Grand Total</p>
          <p class="text-data-primary text-primary-fixed-dim">{{ formatCurrency(grandTotal) }}</p>
        </div>
      </div>
      <p v-if="grandTotal <= 0" class="text-data-secondary text-error -mt-2 mb-md">Enter a gas amount or a connection charge to continue.</p>
      <div>
        <label class="block text-data-secondary text-on-surface-variant mb-3">Payment Method</label>
        <div class="flex overflow-x-auto gap-sm pb-2">
          <button
            v-for="mode in PURCHASE_PAYMENT_MODES"
            :key="mode"
            type="button"
            class="shrink-0 px-5 py-2.5 rounded-full text-data-secondary transition-all flex items-center gap-2"
            :class="form.paymentMode === mode ? 'border border-primary text-primary bg-primary/10' : 'border border-outline-variant text-on-surface-variant hover:bg-surface-variant'"
            @click="form.paymentMode = mode"
          >
            <Icon :name="paymentIcons[mode] ?? 'payments'" class="text-[18px]" /> {{ mode }}
          </button>
        </div>
      </div>
      <div v-if="form.paymentMode === 'credit'" class="mt-md">
        <label class="block text-data-secondary text-on-surface-variant mb-sm">Due Date</label>
        <Input v-model="form.dueDate" type="date" />
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
