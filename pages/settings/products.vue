<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import type { Product, NewProduct } from '~/types/database'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { user } = useUserSession()
if (user.value?.role !== 'admin' && user.value?.role !== 'delivery') await navigateTo('/')

const { fetchProducts, createProduct, updateProduct, deleteProduct, loading, error } = usePricing()
const { fetchInventory, stockIn, error: stockError } = useInventory()

const products = ref<Product[]>([])
const showProductForm = ref(false)
const stockByProductId = ref<Map<number, number>>(new Map())
const restockProductId = ref<number | null>(null)
const restockQty = ref(1)
const editingProductId = ref<number | null>(null)
const editName = ref('')
const deleteConfirmId = ref<number | null>(null)
const actionError = ref<string | null>(null)

async function load() {
  const [productRows, inventoryRows] = await Promise.all([
    fetchProducts(),
    fetchInventory(),
  ])
  products.value = productRows
  stockByProductId.value = new Map(inventoryRows.map((r) => [r.productId, r.quantity]))
}
onMounted(load)

async function handleCreateProduct(data: NewProduct) {
  const created = await createProduct(data)
  if (created) {
    showProductForm.value = false
    await load()
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

function startEdit(product: Product) {
  editingProductId.value = product.id
  editName.value = product.name
  actionError.value = null
}

async function handleEditSave(product: Product) {
  if (!editName.value.trim()) return
  actionError.value = null
  const updated = await updateProduct(product.id, { name: editName.value.trim() })
  if (updated) {
    editingProductId.value = null
    await load()
  } else {
    actionError.value = error.value
  }
}

async function handleDelete(productId: number) {
  actionError.value = null
  const ok = await deleteProduct(productId)
  if (ok) {
    deleteConfirmId.value = null
    await load()
  } else {
    actionError.value = error.value
    deleteConfirmId.value = null
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

    <p v-if="actionError" class="text-data-secondary text-error">{{ actionError }}</p>

    <EmptyState v-if="products.length === 0 && !loading" title="No products yet" />
    <div v-else class="flex flex-col gap-sm">
      <div v-for="product in products" :key="product.id" class="rounded-xl border border-outline-variant/30 bg-surface-container p-4">
        <!-- Edit inline name -->
        <div v-if="editingProductId === product.id" class="flex items-center gap-2 mb-2">
          <input
            v-model="editName"
            class="flex-1 px-3 py-2 rounded-lg border border-surface-variant bg-surface-container-highest text-on-surface text-body-base focus:outline-none focus:border-primary"
            @keydown.enter="handleEditSave(product)"
            @keydown.escape="editingProductId = null"
          >
          <Button size="sm" :disabled="loading" @click="handleEditSave(product)">Save</Button>
          <Button size="sm" variant="outline" @click="editingProductId = null">Cancel</Button>
        </div>

        <!-- Normal view -->
        <div v-else class="flex items-center justify-between">
          <div class="flex-1">
            <p class="text-data-primary text-on-surface">{{ product.name }}</p>
            <p class="text-data-tertiary text-on-surface-variant mt-0.5">
              {{ product.type }}<span v-if="product.cylinderSize"> · {{ product.cylinderSize }}kg</span>
              <span v-if="product.type === 'accessory'"> · {{ stockByProductId.get(product.id) ?? 0 }} in stock</span>
            </p>
          </div>
          <div class="flex gap-1.5 items-center">
            <button
              v-if="product.type === 'accessory'"
              class="flex items-center gap-1 rounded-lg border border-outline-variant/40 bg-surface-container-highest px-3 py-1.5 text-data-tertiary text-on-surface-variant hover:bg-surface-variant transition-colors"
              @click="restockProductId = product.id"
            >
              <Icon name="add_box" class="text-sm" /> Stock In
            </button>
            <button
              class="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors"
              title="Edit name"
              @click="startEdit(product)"
            >
              <Icon name="edit" class="text-sm" />
            </button>
            <button
              class="w-8 h-8 rounded-full flex items-center justify-center text-error hover:bg-error/10 transition-colors"
              title="Delete product"
              @click="deleteConfirmId = product.id"
            >
              <Icon name="delete" class="text-sm" />
            </button>
          </div>
        </div>

        <!-- Stock In section -->
        <div v-if="restockProductId === product.id" class="mt-3 border-t border-outline-variant/20 pt-3 flex items-center gap-2">
          <Input v-model.number="restockQty" type="number" min="1" class="w-24" />
          <Button size="sm" @click="handleRestock(product.id)">Add</Button>
          <Button size="sm" variant="outline" @click="restockProductId = null">Cancel</Button>
        </div>
        <p v-if="restockProductId === product.id && stockError" class="text-data-tertiary text-error mt-1">{{ stockError }}</p>

        <!-- Delete confirm -->
        <div v-if="deleteConfirmId === product.id" class="mt-3 border-t border-error/20 pt-3 flex flex-col gap-2">
          <p class="text-data-secondary text-error">Delete "{{ product.name }}"? If it has delivery history, it will be hidden instead of permanently removed.</p>
          <div class="flex gap-2">
            <Button size="sm" variant="destructive" :disabled="loading" @click="handleDelete(product.id)">
              <LoadingSpinner v-if="loading" class="h-3 w-3 mr-1" />
              Confirm Delete
            </Button>
            <Button size="sm" variant="outline" @click="deleteConfirmId = null">Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
