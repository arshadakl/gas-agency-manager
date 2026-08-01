<script setup lang="ts">
import { Button } from '~/components/ui/button'
import type { PurchaseWithItems, PurchaseFormData, PurchasePaymentEntry } from '~/composables/usePurchases'
import type { CylinderSize } from '~/types'
import { type ClearPaymentRow, makeClearRow } from '~/utils/clearPayment'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { user } = useUserSession()
const route = useRoute()
const id = route.params.id as string
const { showToast } = useToast()

const { fetchPurchase, updatePurchase, deletePurchase, clearPurchase, loading, error } = usePurchases()
const purchase = ref<PurchaseWithItems | null>(null)
const editing = ref(false)
const clearing = ref(false)
const showDeleteConfirm = ref(false)

// Split clear state
const clearRows = ref<ClearPaymentRow[]>([makeClearRow()])

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
    connectionCharge: p.connectionCharge ?? 0,
    payments: (p.payments ?? []).map((pp) => ({ amount: pp.amount, paymentMode: pp.paymentMode as 'cash' | 'bank' })),
    paymentReference: p.paymentReference ?? undefined,
    dueDate: p.dueDate ?? undefined,
    notes: p.notes ?? undefined,
    items: p.items.map((i) => ({
      sizeKg: i.sizeKg as CylinderSize,
      receivedQty: i.receivedQty,
      returnedQty: i.returnedQty,
      newConnectionQty: ('newConnectionQty' in i ? i.newConnectionQty : 0) ?? 0,
      emptyNewQty: ('emptyNewQty' in i ? i.emptyNewQty : 0) ?? 0,
      cylinderCost: ('cylinderCost' in i ? i.cylinderCost : 0) ?? 0,
      unitPrice: i.unitPrice ?? undefined,
    })),
  }
})

const totalReceived = computed(() => purchase.value?.items.reduce((sum, i) => sum + i.receivedQty, 0) ?? 0)
const totalReturned = computed(() => purchase.value?.items.reduce((sum, i) => sum + i.returnedQty, 0) ?? 0)
const totalNewConnections = computed(() => purchase.value?.items.reduce((sum, i) => sum + (('newConnectionQty' in i ? i.newConnectionQty : 0) ?? 0), 0) ?? 0)
const grandTotal = computed(() => (purchase.value?.totalAmount ?? 0) + (purchase.value?.connectionCharge ?? 0))

const isAccessories = computed(() => (purchase.value?.purchaseType ?? 'gas') === 'accessories')
const pendingAmount = computed(() => {
  if (!purchase.value) return 0
  const grand = purchase.value.totalAmount + (purchase.value.connectionCharge ?? 0)
  return Math.round((grand - purchase.value.amountPaid) * 100) / 100
})

const clearTotalPaid = computed(() => clearRows.value.reduce((sum, r) => sum + (Number(r.amount) || 0), 0))
const clearIsValid = computed(() => clearTotalPaid.value > 0 && clearTotalPaid.value <= pendingAmount.value + 0.01)

function startClear() {
  clearRows.value = [makeClearRow(pendingAmount.value)]
  clearing.value = true
}

function addClearRow() {
  clearRows.value.push(makeClearRow())
}

function removeClearRow(rowId: number) {
  if (clearRows.value.length <= 1) return
  clearRows.value = clearRows.value.filter((r) => r.id !== rowId)
}

async function handleClear() {
  if (!clearing.value || !clearIsValid.value) return
  const payments: PurchasePaymentEntry[] = clearRows.value
    .filter((r) => (Number(r.amount) || 0) > 0)
    .map((r) => ({ amount: Number(r.amount), paymentMode: r.paymentMode }))
  const result = await clearPurchase(id, { payments })
  if (result) {
    showToast(`${formatCurrency(clearTotalPaid.value)} payment recorded`)
    clearing.value = false
    purchase.value = await fetchPurchase(id)
  } else {
    showToast(error.value || 'Payment failed. Check your account balance.', 'destructive')
  }
}

async function handleSubmit(data: PurchaseFormData) {
  const updated = await updatePurchase(id, data)
  if (updated) {
    purchase.value = updated
    editing.value = false
  }
}

async function confirmDelete() {
  showDeleteConfirm.value = false
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
            <span class="rounded-full px-2 py-0.5 border text-label-caps" :class="isAccessories ? 'border-tertiary-container/30 text-tertiary bg-tertiary-container/10' : 'border-primary-container/30 text-primary bg-primary-container/10'">
              <Icon :name="isAccessories ? 'inventory_2' : 'local_shipping'" class="text-xs mr-0.5" />
              {{ isAccessories ? 'Accessories' : 'Gas' }}
            </span>
            <span>·</span>
            <span class="flex items-center gap-1"><Icon name="business" class="text-base" /> {{ purchase.supplier }}</span>
            <span>·</span>
            <span class="flex items-center gap-1"><Icon name="calendar_today" class="text-base" /> {{ formatDate(purchase.purchaseDate) }}</span>
          </div>
        </div>

        <!-- Overview Card -->
        <section class="bg-surface-container rounded-xl p-5 border border-surface-container-highest grid grid-cols-1 sm:grid-cols-2 gap-md">
          <div class="flex flex-col gap-xs">
            <span class="text-label-caps text-on-surface-variant uppercase">Grand Total</span>
            <span class="text-headline-md text-primary-fixed-dim">{{ formatCurrency(grandTotal) }}</span>
            <span v-if="purchase.connectionCharge" class="text-data-tertiary text-on-surface-variant">
              Gas {{ formatCurrency(purchase.totalAmount) }} + connection {{ formatCurrency(purchase.connectionCharge) }}
            </span>
          </div>
          <div class="flex flex-col gap-xs">
            <span class="text-label-caps text-on-surface-variant uppercase">Payment Status</span>
            <div class="flex items-center gap-sm">
              <span
                class="rounded-full px-2 py-0.5 border text-label-caps flex items-center gap-1"
                :class="purchase.paymentStatus === 'paid' ? 'bg-tertiary-container/20 border-tertiary-container/30 text-tertiary' : 'bg-error-container/20 border-error-container/30 text-error'"
              >
                <span class="w-1.5 h-1.5 rounded-full" :class="purchase.paymentStatus === 'paid' ? 'bg-tertiary' : 'bg-error'" />
                {{ purchase.paymentStatus.toUpperCase() }}
              </span>
              <span v-if="pendingAmount > 0" class="text-data-secondary text-on-surface-variant">
                {{ formatCurrency(purchase.amountPaid) }} / {{ formatCurrency(grandTotal) }}
              </span>
            </div>
          </div>
        </section>

        <!-- Exchange Details — only for gas purchases -->
        <section v-if="!isAccessories" class="bg-surface-container rounded-xl p-5 border border-surface-container-highest">
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

        <!-- New Connection Cylinders -->
        <section v-if="totalNewConnections > 0" class="bg-surface-container rounded-xl p-5 border border-surface-container-highest">
          <div class="flex items-center justify-between mb-sm pb-sm border-b border-surface-variant">
            <h2 class="text-data-primary text-on-surface flex items-center gap-sm">
              <Icon name="new_releases" class="text-tertiary" /> New Connection Cylinders
            </h2>
            <span class="text-data-primary text-tertiary">{{ totalNewConnections }}</span>
          </div>
          <ul class="flex flex-col gap-xs">
            <li v-for="item in purchase.items.filter((i) => (('newConnectionQty' in i ? i.newConnectionQty : 0) ?? 0) > 0)" :key="`n-${item.sizeKg}`" class="flex justify-between items-center py-1">
              <span class="text-data-secondary text-on-surface-variant">{{ item.sizeKg }}kg</span>
              <span class="text-data-secondary text-on-surface">{{ 'newConnectionQty' in item ? item.newConnectionQty : 0 }}</span>
            </li>
          </ul>
        </section>

        <p v-if="purchase.notes" class="text-data-secondary text-on-surface-variant">{{ purchase.notes }}</p>

        <!-- Payment History -->
        <section v-if="purchase.payments && purchase.payments.length > 0" class="bg-surface-container rounded-xl p-5 border border-surface-container-highest">
          <h2 class="text-data-primary text-on-surface mb-md flex items-center gap-sm">
            <Icon name="receipt_long" :filled="true" class="text-primary" /> Payment History
          </h2>
          <div class="space-y-sm">
            <div v-for="pp in purchase.payments" :key="pp.id" class="flex items-center justify-between py-2 border-b border-surface-container-highest last:border-0">
              <div class="flex items-center gap-sm">
                <span class="w-7 h-7 rounded-full flex items-center justify-center" :class="pp.paymentMode === 'cash' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'">
                  <Icon :name="pp.paymentMode === 'cash' ? 'payments' : 'account_balance'" class="text-sm" />
                </span>
                <div>
                  <span class="text-data-primary text-on-surface">{{ formatCurrency(pp.amount) }}</span>
                  <span class="text-data-tertiary text-on-surface-variant ml-1.5 capitalize">{{ pp.paymentMode }}</span>
                </div>
              </div>
              <div class="text-right">
                <span class="text-data-tertiary text-on-surface-variant">{{ pp.createdByName }}</span>
                <br>
                <span class="text-data-tertiary text-on-surface-variant text-[10px]">{{ formatDate(pp.createdAt) }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Pending payment — split clear option -->
        <div v-if="pendingAmount > 0" class="bg-surface-container rounded-xl p-5 border border-outline-variant/20">
          <div class="flex items-center justify-between mb-sm">
            <span class="text-label-caps text-error uppercase flex items-center gap-xs">
              <Icon name="schedule" class="text-[14px]" /> Pending Payment
            </span>
            <span class="text-data-primary text-error">{{ formatCurrency(pendingAmount) }}</span>
          </div>
          <button
            v-if="!clearing && (user?.role === 'admin' || user?.role === 'delivery')"
            class="w-full py-2.5 rounded-xl bg-primary-container text-on-primary-container text-data-secondary flex items-center justify-center gap-sm"
            @click="startClear"
          >
            <Icon name="check" class="text-sm" /> Record Payment
          </button>
          <div v-if="clearing" class="space-y-md mt-sm">
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
              <div v-if="pendingAmount - clearTotalPaid > 0" class="flex items-center justify-between">
                <span class="text-data-secondary text-on-surface-variant">Still pending</span>
                <span class="text-data-primary text-error">{{ formatCurrency(pendingAmount - clearTotalPaid) }}</span>
              </div>
            </div>
            <div class="flex gap-3">
              <button type="button" class="flex-1 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant text-data-secondary" @click="clearing = false">Cancel</button>
              <button type="button" class="flex-1 py-2.5 rounded-xl bg-primary-container text-on-primary-container text-data-secondary flex items-center justify-center gap-sm" :disabled="loading || !clearIsValid" @click="handleClear">
                <LoadingSpinner v-if="loading" class="h-4 w-4" />
                Confirm
              </button>
            </div>
          </div>
        </div>

        <div v-if="user?.role === 'admin' || user?.role === 'delivery'" class="flex flex-col sm:flex-row gap-sm justify-end">
          <Button variant="outline" class="rounded-lg border-error text-error hover:bg-error/10" @click="showDeleteConfirm = true">
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

    <ConfirmDialog
      :open="showDeleteConfirm"
      title="Delete purchase?"
      message="This purchase record and all its data will be permanently removed. Stock changes will be reversed. This cannot be undone."
      confirm-text="Yes, Delete"
      :destructive="true"
      @confirm="confirmDelete"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>
