<script setup lang="ts">
import type { Customer, Product } from '~/types/database'
import type { OrderCreatePayload } from '~/composables/useOrders'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { createOrder, loading, error } = useOrders()
const { fetchCustomers } = useCustomers()
const { fetchProducts } = usePricing()

const customers = ref<Customer[]>([])
const products = ref<Product[]>([])

onMounted(async () => {
  const [customerRows, productRows] = await Promise.all([fetchCustomers(), fetchProducts()])
  customers.value = customerRows
  products.value = productRows
})

async function handleSubmit(data: OrderCreatePayload) {
  const created = await createOrder(data)
  if (created) await navigateTo('/orders')
}
</script>

<template>
  <div class="px-margin-mobile py-lg pb-8">
    <h1 class="text-headline-md text-on-surface mb-lg">New Order</h1>
    <OrderForm :customers="customers" :products="products" :loading="loading" :error="error" @submit="handleSubmit" />
  </div>
</template>
