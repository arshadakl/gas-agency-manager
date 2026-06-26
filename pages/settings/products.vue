<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Input } from '~/components/ui/input'
import type { Product, NewProduct, Price, NewPrice, Customer } from '~/types/database'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { user } = useUserSession()
if (user.value?.role !== 'admin') await navigateTo('/')

const { fetchProducts, createProduct, fetchPrices, createPrice, loading, error } = usePricing()
const { fetchInventory, stockIn, error: stockError } = useInventory()
const { fetchCustomers } = useCustomers()

const products = ref<Product[]>([])
const showProductForm = ref(false)
const pricingProductId = ref<number | null>(null)
const prices = ref<Price[]>([])
const stockByProductId = ref<Map<number, number>>(new Map())
const restockProductId = ref<number | null>(null)
const restockQty = ref(1)
const customers = ref<Customer[]>([])
const customerNameById = computed(() => new Map(customers.value.map((c) => [c.id, c.name])))
const priceByProductId = ref<Map<number, number>>(new Map())

const getProductPrice = (productId: number) => priceByProductId.value.get(productId)

async function load() {
  const [productRows, inventoryRows, customerRows, allPrices] = await Promise.all([
    fetchProducts(),
    fetchInventory(),
    fetchCustomers(),
    fetchPrices(),
  ])
  products.value = productRows
  stockByProductId.value = new Map(inventoryRows.map((r) => [r.productId, r.quantity]))
  customers.value = customerRows
  // Get default price (customer_id = NULL) for each product
  priceByProductId.value = new Map(
    allPrices
      .filter((p) => !p.customerId) // Only default prices
      .map((p) => [p.productId, p.price])
  )
}
onMounted(load)

async function handleCreateProduct(data: NewProduct) {
  const created = await createProduct(data)
  if (created) {
    showProductForm.value = false
    await load()
  }
}

async function openPricing(productId: number) {
  pricingProductId.value = productId
  prices.value = await fetchPrices(productId)
}

async function handleCreatePrice(data: NewPrice) {
  const created = await createPrice(data)
  if (created && pricingProductId.value) {
    prices.value = await fetchPrices(pricingProductId.value)
  }
}

async function handleRestock(productId: number) {
  if (restockQty.value <= 0) return
  const ok = await stockIn(productId, restockQty.value)
  if (ok) {
    restockProductId.value = null
    restockQty.value = 1
    await load()
  }
}
</script>

<template>
  <div class="px-4 py-4">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-headline-md text-on-surface">Products</h2>
      <Button size="icon" class="rounded-full" @click="showProductForm = true">
        <Icon name="add" />
      </Button>
    </div>

    <div v-if="showProductForm" class="mb-4 rounded-lg border border-border p-4">
      <ProductForm :loading="loading" :error="error" @submit="handleCreateProduct" @cancel="showProductForm = false" />
    </div>

    <EmptyState v-if="products.length === 0 && !loading" title="No products yet" />
    <div v-else class="space-y-2">
      <div v-for="product in products" :key="product.id" class="rounded-lg border border-border p-3">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <p class="text-sm font-medium">{{ product.name }}</p>
            <p class="text-xs text-muted-foreground">
              {{ product.type }}<span v-if="product.cylinderSize"> · {{ product.cylinderSize }}kg</span>
              <span v-if="product.type === 'accessory'"> · {{ stockByProductId.get(product.id) ?? 0 }} in stock</span>
            </p>
            <p v-if="getProductPrice(product.id)" class="text-xs text-on-surface-variant mt-1">
              Price: <span class="font-medium">₹{{ getProductPrice(product.id)?.toFixed(2) }}</span>
            </p>
          </div>
          <div class="flex gap-2">
            <Button v-if="product.type === 'accessory'" size="sm" variant="outline" @click="restockProductId = product.id">
              <Icon name="add_box" class="text-sm mr-1" /> Stock In
            </Button>
            <Button size="sm" variant="outline" @click="openPricing(product.id)">
              <Icon name="sell" class="text-sm mr-1" /> Prices
            </Button>
          </div>
        </div>

        <div v-if="restockProductId === product.id" class="mt-3 border-t border-border pt-3 flex items-center gap-2">
          <Input v-model.number="restockQty" type="number" min="1" class="w-24" />
          <Button size="sm" @click="handleRestock(product.id)">Add</Button>
          <Button size="sm" variant="outline" @click="restockProductId = null">Cancel</Button>
        </div>
        <p v-if="restockProductId === product.id && stockError" class="text-xs text-destructive mt-1">{{ stockError }}</p>

        <div v-if="pricingProductId === product.id" class="mt-3 border-t border-border pt-3 space-y-2">
          <div v-for="price in prices" :key="price.id" class="flex items-center justify-between text-sm">
            <span>
              <Badge variant="secondary">{{ price.customerId ? (customerNameById.get(price.customerId) ?? `Customer #${price.customerId}`) : 'Default' }}</Badge>
              from {{ formatDate(price.effectiveFrom) }}
            </span>
            <span class="font-medium">{{ formatCurrency(price.price) }}</span>
          </div>
          <PriceForm :product-id="product.id" :customers="customers" :loading="loading" :error="error" @submit="handleCreatePrice" @cancel="pricingProductId = null" />
        </div>
      </div>
    </div>
  </div>
</template>
