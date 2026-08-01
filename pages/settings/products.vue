<script setup lang="ts">
import { Button } from '~/components/ui/button'
import type { Product, NewProduct } from '~/types/database'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { user } = useUserSession()
if (user.value?.role !== 'admin' && user.value?.role !== 'delivery') await navigateTo('/')

const { fetchProducts, createProduct, updateProduct, deleteProduct, loading, error } = usePricing()
const { showToast } = useToast()

const products = ref<Product[]>([])
const showProductForm = ref(false)

// Manage modal state
const manageProduct = ref<Product | null>(null)
const productHistoryCount = ref(0)
const manageLoading = ref(false)
const manageMode = ref<'info' | 'rename'>('info')
const renameValue = ref('')

async function load() {
  products.value = await fetchProducts()
}
onMounted(load)

async function handleCreateProduct(data: Parameters<typeof createProduct>[0]) {
  const created = await createProduct(data)
  if (created) {
    showProductForm.value = false
    await load()
  }
}

async function openManage(product: Product) {
  manageProduct.value = product
  manageMode.value = 'info'
  renameValue.value = product.name
  try {
    const res = await $fetch<{ data: { count: number } }>(`/api/products/${product.publicId}/delivery-count`)
    productHistoryCount.value = res.data.count
  } catch {
    productHistoryCount.value = 0
  }
}

async function handleRename() {
  if (!manageProduct.value?.publicId || !renameValue.value.trim()) return
  manageLoading.value = true
  const updated = await updateProduct(manageProduct.value.publicId, { name: renameValue.value.trim() })
  if (updated) {
    manageProduct.value = null
    await load()
  } else {
    showToast(error.value || 'Failed to rename product', 'destructive')
  }
  manageLoading.value = false
}

async function handleHide() {
  if (!manageProduct.value?.publicId) return
  manageLoading.value = true
  const updated = await updateProduct(manageProduct.value.publicId, { isActive: 0 } as Partial<NewProduct>)
  if (updated) {
    manageProduct.value = null
    await load()
  } else {
    showToast(error.value || 'Failed to hide product', 'destructive')
  }
  manageLoading.value = false
}

async function handleDelete() {
  if (!manageProduct.value?.publicId) return
  manageLoading.value = true
  const ok = await deleteProduct(manageProduct.value.publicId)
  if (ok) {
    manageProduct.value = null
    await load()
  } else {
    showToast(error.value || 'Failed to delete product', 'destructive')
  }
  manageLoading.value = false
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
      <ProductForm :loading="loading" @submit="handleCreateProduct" @cancel="showProductForm = false" />
    </div>

    <EmptyState v-if="products.length === 0 && !loading" title="No products yet" />
    <div v-else class="flex flex-col gap-sm">
      <button
        v-for="product in products"
        :key="product.id"
        class="flex items-center justify-between rounded-xl border border-outline-variant/30 bg-surface-container p-4 text-left w-full hover:border-outline-variant/50 transition-colors"
        @click="openManage(product)"
      >
        <div>
          <p class="text-data-primary text-on-surface">{{ product.name }}</p>
          <p class="text-data-tertiary text-on-surface-variant mt-0.5">
            {{ product.type }}<span v-if="product.cylinderSize"> · {{ product.cylinderSize }}kg</span>
          </p>
        </div>
        <Icon name="chevron_right" class="text-on-surface-variant" />
      </button>
    </div>

    <!-- Manage product modal -->
    <div
      v-if="manageProduct"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-8 sm:pb-0"
      @click.self="manageProduct = null"
    >
      <div class="w-full max-w-sm bg-surface-container-high rounded-2xl p-6 space-y-4">
        <!-- Info mode -->
        <template v-if="manageMode === 'info'">
          <div>
            <p class="text-data-primary text-on-surface font-semibold">{{ manageProduct.name }}</p>
            <p class="text-data-tertiary text-on-surface-variant mt-0.5">
              {{ manageProduct.type }}<span v-if="manageProduct.cylinderSize"> · {{ manageProduct.cylinderSize }}kg</span>
            </p>
          </div>

          <div v-if="productHistoryCount > 0" class="rounded-lg bg-surface-container-highest px-3 py-2">
            <p class="text-data-secondary text-on-surface-variant">
              Used in <span class="font-semibold text-on-surface">{{ productHistoryCount }}</span> deliveries. Cannot delete — will be hidden instead.
            </p>
          </div>
          <div v-else class="rounded-lg bg-surface-container-highest px-3 py-2">
            <p class="text-data-secondary text-on-surface-variant">No delivery history. Can be permanently deleted.</p>
          </div>

          <div class="flex gap-2">
            <button
              class="flex-1 rounded-xl border border-outline-variant/40 py-2.5 text-body-base text-on-surface-variant hover:bg-surface-variant transition-colors"
              @click="manageMode = 'rename'"
            >
              <Icon name="edit" class="text-sm mr-1" /> Rename
            </button>
            <button
              v-if="productHistoryCount > 0"
              class="flex-1 rounded-xl bg-primary-container text-on-primary-container py-2.5 text-body-base font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              :disabled="manageLoading"
              @click="handleHide"
            >
              <LoadingSpinner v-if="manageLoading" class="h-4 w-4 mx-auto" />
              <span v-else>Hide</span>
            </button>
            <button
              v-else
              class="flex-1 rounded-xl bg-error text-on-error py-2.5 text-body-base font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              :disabled="manageLoading"
              @click="handleDelete"
            >
              <LoadingSpinner v-if="manageLoading" class="h-4 w-4 mx-auto" />
              <span v-else>Delete</span>
            </button>
          </div>
          <button
            class="w-full rounded-xl border border-outline-variant/40 py-2.5 text-body-base text-on-surface-variant hover:bg-surface-variant transition-colors"
            @click="manageProduct = null"
          >Cancel</button>
        </template>

        <!-- Rename mode -->
        <template v-else>
          <p class="text-data-primary text-on-surface font-semibold">Rename product</p>
          <input
            v-model="renameValue"
            class="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-highest text-on-surface text-body-base focus:outline-none focus:border-primary"
            placeholder="Product name"
            @keydown.enter="handleRename"
          >
          <div class="flex gap-2">
            <button
              class="flex-1 rounded-xl border border-outline-variant/40 py-2.5 text-body-base text-on-surface-variant hover:bg-surface-variant transition-colors"
              @click="manageMode = 'info'"
            >Back</button>
            <button
              class="flex-1 rounded-xl bg-primary-container text-on-primary-container py-2.5 text-body-base font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              :disabled="manageLoading || !renameValue.trim()"
              @click="handleRename"
            >
              <LoadingSpinner v-if="manageLoading" class="h-4 w-4 mx-auto" />
              <span v-else>Save</span>
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
