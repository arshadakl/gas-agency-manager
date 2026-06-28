<script setup lang="ts">
import type { Customer, Product } from '~/types/database'
import type { DeliveryCreatePayload } from '~/composables/useDeliveries'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { createDelivery, loading, error } = useDeliveries()
const { fetchCustomers } = useCustomers()
const { fetchProducts } = usePricing()
const { fetchCylinderStock } = useInventory()
const { showToast } = useToast()

const customers = ref<Customer[]>([])
const products = ref<Product[]>([])
const cylinderFullStock = ref<Record<number, number>>({})

onMounted(async () => {
  const [customerRows, productRows, stockRows] = await Promise.all([
    fetchCustomers(),
    fetchProducts(),
    fetchCylinderStock(),
  ])
  customers.value = customerRows
  products.value = productRows
  cylinderFullStock.value = Object.fromEntries(stockRows.map((s) => [s.sizeKg, s.fullCount]))
})

async function handleSubmit(data: DeliveryCreatePayload & { whatsapp?: boolean }) {
  const { whatsapp, ...payload } = data
  const result = await createDelivery(payload)
  if (!result) return
  if (result.queuedOffline) {
    showToast('Saved offline — will sync when connected')
    await navigateTo('/deliveries')
    return
  }
  if (whatsapp && result.delivery) {
    const customer = customers.value.find((c) => c.id === payload.customerId)
    if (customer) {
      const message = `Hi ${customer.name}, your delivery on ${formatDate(result.delivery.deliveryDate)} for ${formatCurrency(result.delivery.totalAmount)} has been completed. Thank you!`
      window.open(buildWhatsAppLink(customer.whatsappNumber ?? customer.phone, message), '_blank')
    }
  }
  await navigateTo('/deliveries')
}
</script>

<template>
  <div class="px-margin-mobile py-lg pb-8">
    <h1 class="text-headline-md text-on-surface mb-lg">New Delivery</h1>
    <DeliveryForm
      :customers="customers"
      :products="products"
      :cylinder-full-stock="cylinderFullStock"
      :loading="loading"
      :error="error"
      @submit="handleSubmit"
    />
  </div>
</template>
