<script setup lang="ts">
import { Button } from '~/components/ui/button'
import type { OrderWithRelations } from '~/types/database'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { fetchOrders, loading } = useOrders()
const orders = ref<OrderWithRelations[]>([])
const filter = ref<'pending' | 'delivered'>('pending')

async function load() {
  orders.value = await fetchOrders(filter.value)
}
watch(filter, load)
onMounted(load)
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg">
    <div class="flex items-center justify-between">
      <h1 class="text-headline-md text-on-surface">Orders</h1>
      <Button size="icon" class="rounded-full" as-child>
        <NuxtLink to="/orders/new"><Icon name="add" /></NuxtLink>
      </Button>
    </div>

    <div class="flex gap-sm">
      <button
        class="flex-1 px-4 py-1.5 rounded-full text-data-secondary transition-colors"
        :class="filter === 'pending' ? 'bg-primary-container text-on-primary-container font-bold' : 'border border-outline text-on-surface-variant'"
        @click="filter = 'pending'"
      >
        Pending
      </button>
      <button
        class="flex-1 px-4 py-1.5 rounded-full text-data-secondary transition-colors"
        :class="filter === 'delivered' ? 'bg-primary-container text-on-primary-container font-bold' : 'border border-outline text-on-surface-variant'"
        @click="filter = 'delivered'"
      >
        Delivered
      </button>
    </div>

    <div v-if="loading && orders.length === 0" class="flex justify-center py-12">
      <LoadingSpinner />
    </div>
    <EmptyState v-else-if="orders.length === 0" title="No orders yet" description="Booked cylinders will show up here until delivered." />
    <div v-else class="flex flex-col gap-md">
      <OrderCard v-for="order in orders" :key="order.id" :order="order" />
    </div>
  </div>
</template>
