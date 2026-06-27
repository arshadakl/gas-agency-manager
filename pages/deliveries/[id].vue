<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import type { Delivery, DeliveryWithRelations } from '~/types/database'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const route = useRoute()
const { user } = useUserSession()
const { t } = useLocale()
const { fetchDeliveries, updateDelivery, loading, error } = useDeliveries()
const { fetchCustomers } = useCustomers()
const { fetchProducts } = usePricing()

const id = Number(route.params.id)
const delivery = ref<DeliveryWithRelations | null>(null)
const customers = ref([])
const products = ref([])
const isEditing = ref(false)
const markingDelivered = ref(false)

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
              <Badge :class="delivery.paymentStatus === 'paid' ? 'bg-success/15 text-success border-success/30' : 'bg-error-container/40 text-error border-error/30'">
                {{ delivery.paymentStatus === 'paid' ? 'Clear' : 'Pending' }}
              </Badge>
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
              <p class="text-data-primary text-on-surface font-medium">{{ formatCurrency(item.subtotal) }}</p>
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
