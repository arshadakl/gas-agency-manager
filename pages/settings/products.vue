<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import type { Product, NewProduct, Price, NewPrice, Customer } from '~/types/database'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { user } = useUserSession()
if (user.value?.role !== 'admin' && user.value?.role !== 'delivery') await navigateTo('/')

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
  priceByProductId.value = new Map(
    allPrices
      .filter((p) => !p.customerId)
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
  <div class="px-margin-mobile py-lg flex flex-col gap-lg pb-40">
    <div class="flex items-center justify-between">
      <h2 class="text-headline-md text-on-surface">Products</h2>
      <Button size="icon" class="rounded-full" @click="showProductForm = true">
        <Icon name="add" />
      </Button>
    </div>

    <div v-if="showProductForm" class="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
      <ProductForm :loading="loading" :error="error" @submit="handleCreateProduct" @cancel="showProductForm = false" />
    </div>

    <EmptyState v-if="products.length === 0 && !loading" title="No products yet" />
    <div v-else class="flex flex-col gap-sm">
      <div v-for="product in products" :key="product.id" class="rounded-xl border border-outline-variant/30 bg-surface-container p-4">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <p class="text-data-primary text-on-surface">{{ product.name }}</p>
            <p class="text-data-tertiary text-on-surface-variant mt-0.5">
              {{ product.type }}<span v-if="product.cylinderSize"> · {{ product.cylinderSize }}kg</span>
              <span v-if="product.type === 'accessory'"> · {{ stockByProductId.get(product.id) ?? 0 }} in stock</span>
            </p>
            <p v-if="getProductPrice(product.id)" class="text-data-tertiary text-on-surface-variant mt-1">
              Price: <span class="font-medium text-primary-fixed-dim">₹{{ getProductPrice(product.id)?.toFixed(2) }}</span>
            </p>
          </div>
          <div class="flex gap-2">
            <button
              v-if="product.type === 'accessory'"
              class="flex items-center gap-1 rounded-lg border border-outline-variant/40 bg-surface-container-highest px-3 py-1.5 text-data-tertiary text-on-surface-variant hover:bg-surface-variant transition-colors"
              @click="restockProductId = product.id"
            >
              <Icon name="add_box" class="text-sm" /> Stock In
            </button>
            <button
              class="flex items-center gap-1 rounded-lg border border-outline-variant/40 bg-surface-container-highest px-3 py-1.5 text-data-tertiary text-on-surface-variant hover:bg-surface-variant transition-colors"
              @click="openPricing(product.id)"
            >
              <Icon name="sell" class="text-sm" /> Prices
            </button>
          </div>
        </div>

        <div v-if="restockProductId === product.id" class="mt-3 border-t border-outline-variant/20 pt-3 flex items-center gap-2">
          <Input v-model.number="restockQty" type="number" min="1" class="w-24" />
          <Button size="sm" @click="handleRestock(product.id)">Add</Button>
          <Button size="sm" variant="outline" @click="restockProductId = null">Cancel</Button>
        </div>
        <p v-if="restockProductId === product.id && stockError" class="text-data-tertiary text-error mt-1">{{ stockError }}</p>

        <div v-if="pricingProductId === product.id" class="mt-3 border-t border-outline-variant/20 pt-3 space-y-2">
          <div v-for="price in prices" :key="price.id" class="flex items-center justify-between text-data-secondary">
            <span class="text-on-surface-variant">
              <span class="rounded-full bg-surface-container-highest px-2 py-0.5 text-data-tertiary text-on-surface-variant border border-outline-variant/30">
                {{ price.customerId ? (customerNameById.get(price.customerId) ?? `Customer #${price.customerId}`) : 'Default' }}
              </span>
              <span class="ml-2">from {{ formatDate(price.effectiveFrom) }}</span>
            </span>
            <span class="font-medium text-on-surface">{{ formatCurrency(price.price) }}</span>
          </div>
          <PriceForm :product-id="product.id" :customers="customers" :loading="loading" :error="error" @submit="handleCreatePrice" @cancel="pricingProductId = null" />
        </div>
      </div>
    </div>
  </div>
</template>
