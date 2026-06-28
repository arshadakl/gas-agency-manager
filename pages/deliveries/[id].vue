<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { PAYMENT_MODES } from '~/types'
import type { Delivery, DeliveryWithRelations } from '~/types/database'
import type { PaymentMode } from '~/types'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const route = useRoute()
const { user } = useUserSession()
const { t } = useLocale()
const { fetchDeliveries, updateDelivery, markAsPaid, loading, error } = useDeliveries()
const { fetchCustomers } = useCustomers()
const { fetchProducts } = usePricing()

const id = Number(route.params.id)
const delivery = ref<DeliveryWithRelations | null>(null)
const customers = ref([])
const products = ref([])
const isEditing = ref(false)
const markingDelivered = ref(false)
const showPaymentPicker = ref(false)
const selectedPaymentMode = ref<PaymentMode>('cash')

const canEdit = computed(() => user.value?.role === 'admin' || (user.value?.role === 'delivery' && user.value?.id === delivery.value?.createdBy))
const canMarkDelivered = computed(() => delivery.value?.status !== 'delivered' && canEdit.value)

async function load() {
  const [deliveries, customerList, productList] = await Promise.all([
    fetchDeliveries(),
    fetchCustomers(),
    fetchProducts(),
  ])
  delivery.value = deliveries.find(d => d.id === id) || null
  customers.value = customerList
  products.value = productList

  if (!delivery.value) {
    await navigateTo('/deliveries')
  }
}

async function handleMarkDelivered() {
  if (!delivery.value) return
  markingDelivered.value = true
  try {
    const updated = await updateDelivery(id, {
      status: 'delivered',
    })
    if (updated) {
      delivery.value = updated
      await navigateTo('/deliveries')
    }
  } finally {
    markingDelivered.value = false
  }
}

async function handleMarkPaid() {
  const ok = await markAsPaid(id, selectedPaymentMode.value)
  if (ok) {
    delivery.value = { ...delivery.value!, paymentStatus: 'paid' }
    showPaymentPicker.value = false
  }
}

async function handleEditSubmit(data: any) {
  const updated = await updateDelivery(id, data)
  if (updated) {
    delivery.value = updated
    isEditing.value = false
  }
}

onMounted(load)
</script>

<template>
  <div v-if="delivery" class="pb-24">
    <div class="px-4 py-4">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <NuxtLink to="/deliveries" class="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors">
          <Icon name="chevron_left" />
          <span class="text-sm">Back</span>
        </NuxtLink>
        <div v-if="canEdit" class="flex gap-2">
          <Button
            v-if="!isEditing"
            size="sm"
            variant="outline"
            @click="isEditing = true"
          >
            <Icon name="edit" class="text-sm mr-1" /> Edit
          </Button>
          <Button
            v-if="canMarkDelivered && !isEditing"
            size="sm"
            :disabled="markingDelivered"
            @click="handleMarkDelivered"
          >
            <LoadingSpinner v-if="markingDelivered" class="h-4 w-4 mr-1" />
            <Icon v-else name="check_circle" class="text-sm mr-1" />
            Mark Delivered
          </Button>
        </div>
      </div>

      <!-- Edit form -->
      <div v-if="isEditing && customers.length > 0 && products.length > 0" class="mb-4">
        <DeliveryForm
          :customers="customers"
          :products="products"
          :loading="loading"
          :error="error"
          @submit="handleEditSubmit"
          @cancel="isEditing = false"
        />
      </div>

      <!-- View mode -->
      <div v-if="!isEditing && delivery" class="space-y-4">
        <!-- Card: Customer Info -->
        <div class="bg-surface-container rounded-xl p-4 border border-outline-variant/30">
          <p class="text-data-secondary text-on-surface-variant mb-2">Customer</p>
          <NuxtLink :to="`/customers/${delivery.customer.id}`" class="block hover:opacity-80 transition-opacity">
            <p class="text-data-primary text-on-surface">{{ delivery.customer.name }}</p>
            <p class="text-data-tertiary text-on-surface-variant mt-1">{{ delivery.customer.contactPerson }}</p>
          </NuxtLink>
        </div>

        <!-- Card: Delivery Details -->
        <div class="bg-surface-container rounded-xl p-4 border border-outline-variant/30">
          <p class="text-data-secondary text-on-surface-variant mb-3">Details</p>
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-data-tertiary text-on-surface-variant">Date</span>
              <span class="text-data-primary text-on-surface">{{ formatDate(delivery.deliveryDate) }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-data-tertiary text-on-surface-variant">Status</span>
              <Badge :class="delivery.status === 'delivered' ? 'bg-success/15 text-success border-success/30' : 'bg-warning/15 text-warning border-warning/30'">
                {{ delivery.status }}
              </Badge>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-data-tertiary text-on-surface-variant">Payment</span>
              <div class="flex items-center gap-2">
                <Badge :class="delivery.paymentStatus === 'paid' ? 'bg-success/15 text-success border-success/30' : 'bg-error-container/40 text-error border-error/30'">
                  {{ delivery.paymentStatus === 'paid' ? 'Clear' : 'Pay Later' }}
                </Badge>
                <button
                  v-if="canEdit && delivery.paymentStatus === 'pending'"
                  class="flex items-center gap-1 rounded-full bg-success/15 border border-success/30 text-success px-2 py-0.5 text-data-tertiary hover:bg-success/25 transition-colors"
                  @click="showPaymentPicker = !showPaymentPicker"
                >
                  <Icon name="payments" class="text-sm" />
                  Mark Paid
                </button>
              </div>
            </div>
            <!-- Inline payment picker on detail page -->
            <div v-if="showPaymentPicker && delivery.paymentStatus === 'pending'" class="border-t border-outline-variant/20 pt-3 flex flex-col gap-sm">
              <p class="text-data-tertiary text-on-surface-variant">Payment method collected</p>
              <div class="flex gap-1.5 flex-wrap">
                <button
                  v-for="mode in PAYMENT_MODES"
                  :key="mode"
                  class="px-3 py-1.5 rounded-full text-data-tertiary capitalize border transition-all"
                  :class="selectedPaymentMode === mode
                    ? 'bg-primary-container/20 border-primary-container text-primary-fixed-dim font-medium'
                    : 'border-outline-variant/40 text-on-surface-variant hover:bg-surface-variant'"
                  @click="selectedPaymentMode = mode"
                >
                  {{ mode }}
                </button>
              </div>
              <div class="flex gap-2">
                <button
                  class="flex-1 rounded-xl bg-success/20 border border-success/40 text-success py-2 text-data-secondary font-medium hover:bg-success/30 transition-colors disabled:opacity-50"
                  :disabled="loading"
                  @click="handleMarkPaid"
                >
                  <LoadingSpinner v-if="loading" class="h-3 w-3 inline mr-1" />
                  Confirm Paid
                </button>
                <button
                  class="px-4 rounded-xl border border-outline-variant/30 text-on-surface-variant text-data-secondary"
                  @click="showPaymentPicker = false"
                >Cancel</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Card: Items -->
        <div class="bg-surface-container rounded-xl p-4 border border-outline-variant/30">
          <p class="text-data-secondary text-on-surface-variant mb-3">Items</p>
          <div class="space-y-2">
            <div v-for="item in delivery.items" :key="item.id" class="flex justify-between items-center pb-2 last:pb-0 last:border-0 border-b border-outline-variant/20">
              <div>
                <p class="text-data-primary text-on-surface">{{ item.product.name }}</p>
                <p class="text-data-tertiary text-on-surface-variant">Qty: {{ item.quantity }}</p>
              </div>
              <p class="text-data-primary text-on-surface font-medium">× {{ item.quantity }}</p>
            </div>
          </div>
        </div>

        <!-- Card: Amount -->
        <div class="bg-surface-container rounded-xl p-4 border border-outline-variant/30">
          <div class="flex justify-between items-center">
            <p class="text-data-secondary text-on-surface-variant">Total Amount</p>
            <p class="text-display-lg text-on-surface font-bold">{{ formatCurrency(delivery.totalAmount) }}</p>
          </div>
        </div>

        <!-- Card: Notes -->
        <div v-if="delivery.notes" class="bg-surface-container rounded-xl p-4 border border-outline-variant/30">
          <p class="text-data-secondary text-on-surface-variant mb-2">Notes</p>
          <p class="text-data-primary text-on-surface">{{ delivery.notes }}</p>
        </div>

        <!-- Card: Meta -->
        <div class="bg-surface-container rounded-xl p-4 border border-outline-variant/30">
          <p class="text-data-secondary text-on-surface-variant mb-2">{{ t('recorded_by') }}</p>
          <p class="text-data-primary text-on-surface">{{ delivery.createdByName }}</p>
          <p class="text-data-tertiary text-on-surface-variant mt-1">{{ formatDate(delivery.createdAt) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
