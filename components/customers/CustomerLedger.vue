<script setup lang="ts">
import { PAYMENT_MODES } from '~/types'
import type { DeliveryWithRelations, CustomerPayment } from '~/types/database'
import type { PaymentMode } from '~/types'

const props = defineProps<{
  totalBilled: number
  totalPaid: number
  balance: number
  openingBalance: number
  customerId: number
  customerPublicId: string
  deliveries: DeliveryWithRelations[]
  payments: CustomerPayment[]
}>()

const emit = defineEmits<{
  paid: []
}>()

const { user } = useUserSession()
const { collectPayment, loading } = useDeliveries()
const { recordPayment, loading: paymentLoading } = usePayments()
const { setOpeningBalance } = useCustomers()

const canEdit = computed(() => user.value?.role === 'admin' || user.value?.role === 'delivery')

const activeTab = ref<'deliveries' | 'payments'>('deliveries')

// Lazy loading — 5 items at a time
const DELIVERIES_PAGE = 5
const PAYMENTS_PAGE = 5
const visibleDeliveryCount = ref(DELIVERIES_PAGE)
const visiblePaymentCount = ref(PAYMENTS_PAGE)

const visibleDeliveries = computed(() => props.deliveries.slice(0, visibleDeliveryCount.value))
const hasMoreDeliveries = computed(() => visibleDeliveryCount.value < props.deliveries.length)

const visiblePayments = computed(() => props.payments.slice(0, visiblePaymentCount.value))
const hasMorePayments = computed(() => visiblePaymentCount.value < props.payments.length)

function loadMoreDeliveries() {
  visibleDeliveryCount.value += DELIVERIES_PAGE
}
function loadMorePayments() {
  visiblePaymentCount.value += PAYMENTS_PAGE
}

// Opening balance collect
const showOpeningBalancePicker = ref(false)
const openingBalanceAmount = ref<number | ''>('')
const openingBalanceMode = ref<PaymentMode>('cash')

function openOpeningBalancePicker() {
  const maxCollect = Math.max(0, props.balance)
  openingBalanceAmount.value = maxCollect > 0 ? Math.min(props.openingBalance, maxCollect) : props.openingBalance
  openingBalanceMode.value = 'cash'
  showOpeningBalancePicker.value = true
}

async function handleCollectOpeningBalance() {
  const amount = Number(openingBalanceAmount.value || 0)
  if (amount <= 0) return

  const created = await recordPayment({
    customerId: props.customerId,
    amount,
    paymentMode: openingBalanceMode.value,
    paymentDate: toISODate(new Date()),
    notes: 'Opening balance settlement',
  })
  if (created) {
    showOpeningBalancePicker.value = false
    emit('paid')
  }
}

// Opening balance edit / adjust
const showEditOpeningBalance = ref(false)
const editOpeningBalanceInput = ref<number | ''>('')
const editOpeningBalanceLoading = ref(false)
const editOpeningBalanceError = ref<string | null>(null)

function openEditOpeningBalance() {
  editOpeningBalanceInput.value = props.openingBalance || ''
  editOpeningBalanceError.value = null
  showEditOpeningBalance.value = true
}

async function handleSaveOpeningBalance() {
  editOpeningBalanceError.value = null
  const newAmount = editOpeningBalanceInput.value === '' ? 0 : Number(editOpeningBalanceInput.value)
  if (newAmount < 0) {
    editOpeningBalanceError.value = 'Opening balance cannot be negative'
    return
  }
  editOpeningBalanceLoading.value = true
  const ok = await setOpeningBalance(props.customerPublicId, newAmount)
  editOpeningBalanceLoading.value = false
  if (ok) {
    showEditOpeningBalance.value = false
    emit('paid')
  } else {
    editOpeningBalanceError.value = 'Failed to update opening balance'
  }
}

// Delivery pending payments
const pendingDeliveries = computed(() => props.deliveries.filter((d) => d.paymentStatus !== 'paid'))

function remainingDue(delivery: DeliveryWithRelations) {
  return Math.round((delivery.totalAmount - delivery.amountCollected) * 100) / 100
}

function formatItems(items: DeliveryWithRelations['items']) {
  if (!items || items.length === 0) return ''
  return items.map((i) => {
    const size = i.product.cylinderSize ? `${i.product.cylinderSize}kg` : ''
    const label = i.product.type === 'cylinder' ? `${size} Cylinder` : i.product.name
    return `${label} × ${i.quantity}`
  }).join(' · ')
}

// Delivery collect
const activePicker = ref<number | null>(null)
const collectAmount = ref<number | ''>('')
const selectedMode = ref<PaymentMode>('cash')

function openPicker(delivery: DeliveryWithRelations) {
  activePicker.value = delivery.id
  collectAmount.value = remainingDue(delivery)
  selectedMode.value = 'cash'
}

async function handleCollect(delivery: DeliveryWithRelations) {
  const amount = Number(collectAmount.value || 0)
  if (amount <= 0 || !delivery.publicId) return
  const ok = await collectPayment(delivery.publicId, amount, selectedMode.value)
  if (ok) {
    activePicker.value = null
    emit('paid')
  }
}
</script>

<template>
  <div class="flex flex-col gap-lg">
    <!-- Balance summary -->
    <div class="bg-surface-container-high rounded-xl border border-outline-variant/30 grid grid-cols-3 gap-2 p-4 text-center">
      <div>
        <p class="text-data-tertiary text-on-surface-variant">Billed</p>
        <p class="text-data-primary text-on-surface mt-1">{{ formatCurrency(totalBilled) }}</p>
      </div>
      <div>
        <p class="text-data-tertiary text-on-surface-variant">Paid</p>
        <p class="text-data-primary text-on-surface mt-1">{{ formatCurrency(totalPaid) }}</p>
      </div>
      <div>
        <p class="text-data-tertiary text-on-surface-variant">Balance</p>
        <p class="text-data-primary mt-1" :class="balance > 0 ? 'text-error' : 'text-primary-fixed-dim'">{{ formatCurrency(balance) }}</p>
      </div>
    </div>

    <!-- Opening Balance Notice (if > 0) -->
    <div v-if="openingBalance > 0" class="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-data-tertiary">
      <div class="flex items-center gap-2">
        <Icon name="history" class="text-base text-on-surface-variant" />
        <span class="text-on-surface-variant">Pre-app Opening Balance: <strong class="text-on-surface font-medium">{{ formatCurrency(openingBalance) }}</strong></span>
      </div>
      <button v-if="canEdit" class="text-primary hover:underline font-medium text-data-tertiary flex items-center gap-1" @click="openEditOpeningBalance">
        <Icon name="edit" class="text-xs" />
        Edit
      </button>
    </div>

    <!-- Tab bar -->
    <div class="flex bg-surface-container rounded-full p-1 border border-outline-variant/20">
      <button
        class="flex-1 py-2 rounded-full text-data-secondary font-medium transition-all"
        :class="activeTab === 'deliveries'
          ? 'bg-primary-container text-on-primary-container'
          : 'text-on-surface-variant hover:text-on-surface'"
        @click="activeTab = 'deliveries'"
      >
        Deliveries
      </button>
      <button
        class="flex-1 py-2 rounded-full text-data-secondary font-medium transition-all"
        :class="activeTab === 'payments'
          ? 'bg-primary-container text-on-primary-container'
          : 'text-on-surface-variant hover:text-on-surface'"
        @click="activeTab = 'payments'"
      >
        Payments
      </button>
    </div>

    <!-- ==================== DELIVERIES TAB ==================== -->
    <template v-if="activeTab === 'deliveries'">
      <div>
        <h2 class="text-data-primary text-on-surface mb-sm">All Deliveries</h2>
        <EmptyState v-if="deliveries.length === 0" title="No deliveries yet" />
        <div v-else class="rounded-xl border border-outline-variant/30 bg-surface-container-low divide-y divide-outline-variant/20">
          <div v-for="delivery in visibleDeliveries" :key="delivery.id" class="px-4 py-3">
            <div class="flex justify-between items-center text-body-base text-on-surface">
              <span>{{ formatDate(delivery.deliveryDate) }}</span>
              <div class="flex items-center gap-2">
                <span
                  class="text-data-tertiary px-2 py-0.5 rounded-full border"
                  :class="{
                    'bg-success/10 border-success/30 text-success': delivery.paymentStatus === 'paid',
                    'bg-amber-500/10 border-amber-500/30 text-amber-500': delivery.paymentStatus === 'partial',
                    'bg-error-container/30 border-error/20 text-error': delivery.paymentStatus === 'pending',
                  }"
                >
                  {{ delivery.paymentStatus === 'paid' ? 'Clear' : delivery.paymentStatus === 'partial' ? 'Partial' : 'Pay Later' }}
                </span>
                <span class="text-data-primary">{{ formatCurrency(delivery.totalAmount) }}</span>
              </div>
            </div>
            <p v-if="delivery.items.length > 0" class="text-data-tertiary text-on-surface-variant mt-0.5 truncate">
              {{ formatItems(delivery.items) }}
            </p>
            <p class="text-data-tertiary text-on-surface-variant mt-0.5">{{ delivery.createdByName }}</p>
          </div>
        </div>
        <button
          v-if="hasMoreDeliveries"
          class="w-full mt-3 py-2.5 rounded-xl border border-outline-variant/30 text-on-surface-variant text-data-secondary font-medium hover:bg-surface-container-high transition-colors"
          @click="loadMoreDeliveries"
        >
          Load More ({{ visibleDeliveries.length }} of {{ deliveries.length }})
        </button>
      </div>
    </template>

    <!-- ==================== PAYMENTS TAB ==================== -->
    <template v-if="activeTab === 'payments'">
      <!-- Opening Balance as pending payment -->
      <div v-if="openingBalance > 0 && canEdit" class="rounded-xl border border-error/20 bg-surface-container-low p-4">
        <div class="flex justify-between items-center">
          <div>
            <div class="flex items-center gap-2">
              <p class="text-data-secondary text-on-surface">Opening Balance</p>
              <span class="rounded-full bg-error-container/40 border border-error/30 text-error text-data-tertiary px-2 py-0.5">
                Pre-app
              </span>
            </div>
            <p class="text-data-tertiary text-on-surface-variant mt-0.5">Debt carried before app was started</p>
          </div>
          <div class="flex items-center gap-2 shrink-0 ml-2">
            <span class="text-data-primary text-error font-medium">{{ formatCurrency(openingBalance) }}</span>
            <button
              class="flex items-center gap-1 rounded-full border border-outline-variant/40 text-on-surface-variant px-2.5 py-1 text-data-tertiary hover:bg-surface-container transition-colors active:scale-95"
              title="Edit Opening Balance"
              @click="openEditOpeningBalance"
            >
              <Icon name="edit" class="text-sm" />
              Edit
            </button>
            <button
              v-if="balance > 0"
              class="flex items-center gap-1 rounded-full bg-success/15 border border-success/30 text-success px-3 py-1 text-data-tertiary hover:bg-success/25 transition-colors active:scale-95"
              @click="showOpeningBalancePicker ? showOpeningBalancePicker = false : openOpeningBalancePicker()"
            >
              <Icon name="payments" class="text-sm" />
              Collect
            </button>
          </div>
        </div>

        <!-- Inline collect form -->
        <div v-if="showOpeningBalancePicker" class="border-t border-outline-variant/20 pt-sm mt-3 flex flex-col gap-sm">
          <label class="text-data-tertiary text-on-surface-variant">Amount (₹, max {{ formatCurrency(Math.max(0, balance)) }})</label>
          <input
            v-model.number="openingBalanceAmount"
            type="number"
            inputmode="numeric"
            min="0"
            :max="Math.max(0, balance)"
            step="1"
            class="block w-full px-3 py-2 border border-surface-variant rounded-lg bg-surface text-on-surface text-body-base focus:outline-none focus:border-primary"
          >
          <p class="text-data-tertiary text-on-surface-variant">Payment method</p>
          <div class="flex gap-1.5 flex-wrap">
            <button
              v-for="mode in PAYMENT_MODES"
              :key="mode"
              class="px-3 py-1.5 rounded-full text-data-tertiary capitalize border transition-all"
              :class="openingBalanceMode === mode
                ? 'bg-primary-container/20 border-primary-container text-primary-fixed-dim font-medium'
                : 'border-outline-variant/40 text-on-surface-variant hover:bg-surface-variant'"
              @click="openingBalanceMode = mode"
            >
              {{ mode }}
            </button>
          </div>
          <div class="flex gap-2">
            <button
              class="flex-1 rounded-xl bg-success/20 border border-success/40 text-success py-2 text-data-secondary font-medium hover:bg-success/30 transition-colors disabled:opacity-50"
              :disabled="paymentLoading || !openingBalanceAmount || Number(openingBalanceAmount) <= 0"
              @click="handleCollectOpeningBalance"
            >
              <LoadingSpinner v-if="paymentLoading" class="h-3 w-3 inline mr-1" />
              Confirm Collect
            </button>
            <button
              class="px-4 rounded-xl border border-outline-variant/30 text-on-surface-variant text-data-secondary hover:bg-surface-variant transition-colors"
              @click="showOpeningBalancePicker = false"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <!-- If opening balance is 0 and user can edit, provide button to set pre-app debt -->
      <div v-else-if="openingBalance === 0 && canEdit" class="rounded-xl border border-dashed border-outline-variant/40 bg-surface-container-low p-3.5 flex justify-between items-center">
        <div>
          <p class="text-data-secondary text-on-surface">Pre-App Pending Amount</p>
          <p class="text-data-tertiary text-on-surface-variant">No opening balance set for this customer.</p>
        </div>
        <button
          class="flex items-center gap-1 rounded-full border border-primary/40 text-primary px-3 py-1 text-data-tertiary hover:bg-primary/10 transition-colors"
          @click="openEditOpeningBalance"
        >
          <Icon name="add" class="text-sm" />
          Set Amount
        </button>
      </div>

      <!-- Inline edit opening balance form (accessible whether openingBalance is 0 or > 0) -->
      <div v-if="showEditOpeningBalance" class="rounded-xl border border-primary/40 bg-surface-container p-4 flex flex-col gap-sm">
        <p class="text-data-secondary font-medium text-on-surface">Set Pre-App Pending Amount / Opening Balance</p>
        <p class="text-data-tertiary text-on-surface-variant">Enter the pre-existing debt owed before using this software. This amount will be added to the customer's ledger balance.</p>
        <label class="text-data-tertiary text-on-surface-variant">Opening Balance (₹)</label>
        <input
          v-model.number="editOpeningBalanceInput"
          type="number"
          inputmode="numeric"
          min="0"
          step="1"
          placeholder="0"
          class="block w-full px-3 py-2 border border-surface-variant rounded-lg bg-surface text-on-surface text-body-base focus:outline-none focus:border-primary"
        >
        <p v-if="editOpeningBalanceError" class="text-data-tertiary text-error">{{ editOpeningBalanceError }}</p>
        <div class="flex gap-2">
          <button
            class="flex-1 rounded-xl bg-primary text-on-primary py-2 text-data-secondary font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            :disabled="editOpeningBalanceLoading"
            @click="handleSaveOpeningBalance"
          >
            <LoadingSpinner v-if="editOpeningBalanceLoading" class="h-3 w-3 inline mr-1" />
            Save Balance
          </button>
          <button
            class="px-4 rounded-xl border border-outline-variant/30 text-on-surface-variant text-data-secondary hover:bg-surface-variant transition-colors"
            @click="showEditOpeningBalance = false"
          >
            Cancel
          </button>
        </div>
      </div>

      <!-- Pending payments from deliveries -->
      <div v-if="pendingDeliveries.length > 0">
        <h2 class="text-data-primary text-on-surface mb-sm flex items-center gap-2">
          Pending Deliveries
          <span class="rounded-full bg-error-container/40 border border-error/30 text-error text-data-tertiary px-2 py-0.5">
            {{ pendingDeliveries.length }}
          </span>
        </h2>
        <div class="rounded-xl border border-error/20 bg-surface-container-low divide-y divide-outline-variant/20 overflow-hidden">
          <div v-for="delivery in pendingDeliveries" :key="delivery.id" class="px-4 py-3 flex flex-col gap-sm">
            <div class="flex justify-between items-center">
              <div class="flex-1 min-w-0">
                <p class="text-data-secondary text-on-surface">{{ formatDate(delivery.deliveryDate) }}</p>
                <p class="text-data-tertiary text-on-surface-variant mt-0.5">{{ delivery.createdByName }}</p>
                <p v-if="delivery.items.length > 0" class="text-data-tertiary text-on-surface-variant mt-0.5 truncate">
                  {{ formatItems(delivery.items) }}
                </p>
                <p v-if="delivery.paymentStatus === 'partial'" class="text-data-tertiary text-amber-500 mt-0.5">
                  {{ formatCurrency(delivery.amountCollected) }} collected of {{ formatCurrency(delivery.totalAmount) }}
                </p>
              </div>
              <div class="flex items-center gap-2 shrink-0 ml-2">
                <span class="text-data-primary text-error font-medium">{{ formatCurrency(remainingDue(delivery)) }}</span>
                <button
                  v-if="canEdit"
                  class="flex items-center gap-1 rounded-full bg-success/15 border border-success/30 text-success px-3 py-1 text-data-tertiary hover:bg-success/25 transition-colors active:scale-95"
                  @click="activePicker === delivery.id ? activePicker = null : openPicker(delivery)"
                >
                  <Icon name="payments" class="text-sm" />
                  Collect
                </button>
              </div>
            </div>

            <!-- Inline collect form -->
            <div v-if="activePicker === delivery.id" class="border-t border-outline-variant/20 pt-sm flex flex-col gap-sm">
              <label class="text-data-tertiary text-on-surface-variant">Amount (₹, max {{ formatCurrency(remainingDue(delivery)) }})</label>
              <input
                v-model.number="collectAmount"
                type="number"
                inputmode="numeric"
                min="0"
                :max="remainingDue(delivery)"
                step="1"
                class="block w-full px-3 py-2 border border-surface-variant rounded-lg bg-surface text-on-surface text-body-base focus:outline-none focus:border-primary"
              >
              <p class="text-data-tertiary text-on-surface-variant">Payment method</p>
              <div class="flex gap-1.5 flex-wrap">
                <button
                  v-for="mode in PAYMENT_MODES"
                  :key="mode"
                  class="px-3 py-1.5 rounded-full text-data-tertiary capitalize border transition-all"
                  :class="selectedMode === mode
                    ? 'bg-primary-container/20 border-primary-container text-primary-fixed-dim font-medium'
                    : 'border-outline-variant/40 text-on-surface-variant hover:bg-surface-variant'"
                  @click="selectedMode = mode"
                >
                  {{ mode }}
                </button>
              </div>
              <div class="flex gap-2">
                <button
                  class="flex-1 rounded-xl bg-success/20 border border-success/40 text-success py-2 text-data-secondary font-medium hover:bg-success/30 transition-colors disabled:opacity-50"
                  :disabled="loading || !collectAmount || Number(collectAmount) <= 0"
                  @click="handleCollect(delivery)"
                >
                  <LoadingSpinner v-if="loading" class="h-3 w-3 inline mr-1" />
                  Confirm Collect
                </button>
                <button
                  class="px-4 rounded-xl border border-outline-variant/30 text-on-surface-variant text-data-secondary hover:bg-surface-variant transition-colors"
                  @click="activePicker = null"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Payment history -->
      <div>
        <h2 class="text-data-primary text-on-surface mb-sm">Payment History</h2>
        <EmptyState v-if="payments.length === 0" title="No payments yet" />
        <div v-else class="rounded-xl border border-outline-variant/30 bg-surface-container-low divide-y divide-outline-variant/20">
          <div v-for="payment in visiblePayments" :key="payment.id" class="flex justify-between px-4 py-3 text-body-base text-on-surface">
            <span>{{ formatDate(payment.paymentDate) }} · {{ payment.paymentMode }}</span>
            <span class="text-data-primary">{{ formatCurrency(payment.amount) }}</span>
          </div>
        </div>
        <button
          v-if="hasMorePayments"
          class="w-full mt-3 py-2.5 rounded-xl border border-outline-variant/30 text-on-surface-variant text-data-secondary font-medium hover:bg-surface-container-high transition-colors"
          @click="loadMorePayments"
        >
          Load More ({{ visiblePayments.length }} of {{ payments.length }})
        </button>
      </div>
    </template>
  </div>
</template>