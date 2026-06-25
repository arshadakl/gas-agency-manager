<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import type { OrderWithRelations } from '~/types/database'
import type { OrderDeliverPayload } from '~/composables/useOrders'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const route = useRoute()
const id = Number(route.params.id)

const { fetchOrder, deliverOrder, cancelOrder, loading, error } = useOrders()
const order = ref<OrderWithRelations | null>(null)
const showConfirm = ref(false)
const showCancelConfirm = ref(false)

onMounted(async () => {
  order.value = await fetchOrder(id)
})

async function handleConfirmDeliver(data: OrderDeliverPayload) {
  const result = await deliverOrder(id, data)
  if (result) await navigateTo('/orders')
}

async function handleConfirmCancel() {
  const ok = await cancelOrder(id)
  showCancelConfirm.value = false
  if (ok) await navigateTo('/orders')
}
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg">
    <div v-if="!order" class="flex justify-center py-12">
      <LoadingSpinner />
    </div>
    <template v-else>
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-headline-md text-on-surface">{{ order.customer.name }}</h1>
          <p v-if="order.customer.contactPerson" class="text-data-secondary text-on-surface-variant mt-1">{{ order.customer.contactPerson }}</p>
        </div>
        <Badge :variant="order.status === 'delivered' ? 'default' : order.status === 'cancelled' ? 'destructive' : 'secondary'">{{ order.status }}</Badge>
      </div>

      <section class="bg-surface-container rounded-xl p-5 border border-surface-container-highest space-y-1">
        <p class="text-data-secondary text-on-surface-variant">Booking Date: <span class="text-on-surface">{{ formatDate(order.orderDate) }}</span></p>
        <p class="text-data-secondary text-on-surface-variant">Booked by: <span class="text-on-surface">{{ order.createdByName }}</span></p>
        <p v-if="order.notes" class="text-data-secondary text-on-surface-variant">Notes: <span class="text-on-surface">{{ order.notes }}</span></p>
      </section>

      <section class="bg-surface-container rounded-xl divide-y divide-surface-container-highest overflow-hidden">
        <div v-for="item in order.items" :key="item.id" class="flex justify-between items-center p-4">
          <span class="text-data-primary text-on-surface">{{ item.product.name }}</span>
          <span class="text-data-secondary text-on-surface-variant">x{{ item.quantity }}</span>
        </div>
      </section>

      <template v-if="order.status === 'pending'">
        <Button class="w-full rounded-lg" @click="showConfirm = true">
          <Icon name="local_shipping" class="text-base mr-2" /> Mark Delivered
        </Button>
        <Button variant="outline" class="w-full rounded-lg border-error text-error hover:bg-error/10" @click="showCancelConfirm = true">
          <Icon name="cancel" class="text-base mr-2" /> Cancel Order
        </Button>
      </template>

      <DeliverConfirm
        :open="showConfirm"
        :loading="loading"
        :error="error"
        @confirm="handleConfirmDeliver"
        @cancel="showConfirm = false"
      />

      <ConfirmDialog
        :open="showCancelConfirm"
        title="Cancel this order?"
        message="The customer's booking will be removed. This can't be undone."
        confirm-text="Yes, Cancel"
        :destructive="true"
        @confirm="handleConfirmCancel"
        @cancel="showCancelConfirm = false"
      />
    </template>
  </div>
</template>
