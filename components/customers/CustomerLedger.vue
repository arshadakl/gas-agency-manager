<script setup lang="ts">
import { PAYMENT_MODES } from '~/types'
import type { Delivery, CustomerPayment } from '~/types/database'
import type { PaymentMode } from '~/types'

const props = defineProps<{
  totalBilled: number
  totalPaid: number
  balance: number
  deliveries: Delivery[]
  payments: CustomerPayment[]
}>()

const emit = defineEmits<{
  paid: []
}>()

const { user } = useUserSession()
const { markAsPaid, loading } = useDeliveries()

const canEdit = computed(() => user.value?.role === 'admin' || user.value?.role === 'delivery')
const pendingDeliveries = computed(() => props.deliveries.filter(d => d.paymentStatus === 'pending'))

const activePicker = ref<number | null>(null)
const selectedMode = ref<PaymentMode>('cash')

function openPicker(deliveryId: number) {
  activePicker.value = deliveryId
  selectedMode.value = 'cash'
}

async function handleMarkPaid(deliveryId: number) {
  const ok = await markAsPaid(deliveryId, selectedMode.value)
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

    <!-- Pending payments section -->
    <div v-if="pendingDeliveries.length > 0">
      <h2 class="text-data-primary text-on-surface mb-sm flex items-center gap-2">
        Pending Payments
        <span class="rounded-full bg-error-container/40 border border-error/30 text-error text-data-tertiary px-2 py-0.5">
          {{ pendingDeliveries.length }}
        </span>
      </h2>
      <div class="rounded-xl border border-error/20 bg-surface-container-low divide-y divide-outline-variant/20 overflow-hidden">
        <div v-for="delivery in pendingDeliveries" :key="delivery.id" class="px-4 py-3 flex flex-col gap-sm">
          <div class="flex justify-between items-center">
            <div>
              <p class="text-data-secondary text-on-surface">{{ formatDate(delivery.deliveryDate) }}</p>
              <p class="text-data-tertiary text-on-surface-variant mt-0.5">{{ delivery.createdByName }}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-data-primary text-error font-medium">{{ formatCurrency(delivery.totalAmount) }}</span>
              <button
                v-if="canEdit"
                class="flex items-center gap-1 rounded-full bg-success/15 border border-success/30 text-success px-3 py-1 text-data-tertiary hover:bg-success/25 transition-colors active:scale-95"
                @click="activePicker === delivery.id ? activePicker = null : openPicker(delivery.id)"
              >
                <Icon name="payments" class="text-sm" />
                Mark Paid
              </button>
            </div>
          </div>

          <!-- Inline mode picker -->
          <div v-if="activePicker === delivery.id" class="border-t border-outline-variant/20 pt-sm flex flex-col gap-sm">
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
                :disabled="loading"
                @click="handleMarkPaid(delivery.id)"
              >
                <LoadingSpinner v-if="loading" class="h-3 w-3 inline mr-1" />
                Confirm Paid
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

    <!-- Recent deliveries -->
    <div>
      <h2 class="text-data-primary text-on-surface mb-sm">Recent Deliveries</h2>
      <EmptyState v-if="deliveries.length === 0" title="No deliveries yet" />
      <div v-else class="rounded-xl border border-outline-variant/30 bg-surface-container-low divide-y divide-outline-variant/20">
        <div v-for="delivery in deliveries" :key="delivery.id" class="px-4 py-3">
          <div class="flex justify-between items-center text-body-base text-on-surface">
            <span>{{ formatDate(delivery.deliveryDate) }}</span>
            <div class="flex items-center gap-2">
              <span
                class="text-data-tertiary px-2 py-0.5 rounded-full border"
                :class="delivery.paymentStatus === 'paid'
                  ? 'bg-success/10 border-success/30 text-success'
                  : 'bg-error-container/30 border-error/20 text-error'"
              >
                {{ delivery.paymentStatus === 'paid' ? 'Clear' : 'Pay Later' }}
              </span>
              <span class="text-data-primary">{{ formatCurrency(delivery.totalAmount) }}</span>
            </div>
          </div>
          <p class="text-data-tertiary text-on-surface-variant mt-0.5">{{ delivery.createdByName }}</p>
        </div>
      </div>
    </div>

    <!-- Recent payments -->
    <div>
      <h2 class="text-data-primary text-on-surface mb-sm">Recent Payments</h2>
      <EmptyState v-if="payments.length === 0" title="No payments yet" />
      <div v-else class="rounded-xl border border-outline-variant/30 bg-surface-container-low divide-y divide-outline-variant/20">
        <div v-for="payment in payments" :key="payment.id" class="flex justify-between px-4 py-3 text-body-base text-on-surface">
          <span>{{ formatDate(payment.paymentDate) }} · {{ payment.paymentMode }}</span>
          <span class="text-data-primary">{{ formatCurrency(payment.amount) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
