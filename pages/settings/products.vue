<script setup lang="ts">
import { Button } from '~/components/ui/button'
import type { Product } from '~/types/database'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { user } = useUserSession()
if (user.value?.role !== 'admin' && user.value?.role !== 'delivery') await navigateTo('/')

const { fetchProducts, createProduct, updateProduct, deleteProduct, loading, error } = usePricing()

const products = ref<Product[]>([])
const showProductForm = ref(false)
const editingProductPublicId = ref<string | null>(null)
const editName = ref('')
const actionError = ref<string | null>(null)

// Manage modal state
const manageProduct = ref<Product | null>(null)
const productHistoryCount = ref(0)
const manageLoading = ref(false)

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

function startEdit(product: Product) {
  editingProductPublicId.value = product.publicId
  editName.value = product.name
  actionError.value = null
}

async function handleEditSave(product: Product) {
  if (!editName.value.trim() || !product.publicId) return
  actionError.value = null
  const updated = await updateProduct(product.publicId, { name: editName.value.trim() })
  if (updated) {
    editingProductPublicId.value = null
    await load()
  } else {
    actionError.value = error.value
  }
}

async function openManage(product: Product) {
  manageProduct.value = product
  actionError.value = null
  // Check delivery history count
  try {
    const res = await $fetch<{ data: { count: number } }>(`/api/products/${product.publicId}/delivery-count`)
    productHistoryCount.value = res.data.count
  } catch {
    productHistoryCount.value = 0
  }
}

async function handleHide() {
  if (!manageProduct.value?.publicId) return
  manageLoading.value = true
  actionError.value = null
  const updated = await updateProduct(manageProduct.value.publicId, { isActive: false } as any)
  if (updated) {
    manageProduct.value = null
    await load()
  } else {
    actionError.value = error.value
  }
  manageLoading.value = false
}

async function handleDelete() {
  if (!manageProduct.value?.publicId) return
  manageLoading.value = true
  actionError.value = null
  const ok = await deleteProduct(manageProduct.value.publicId)
  if (ok) {
    manageProduct.value = null
    await load()
  } else {
    actionError.value = error.value
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
      <ProductForm :loading="loading" :error="error" @submit="handleCreateProduct" @cancel="showProductForm = false" />
    </div>

    <p v-if="actionError" class="text-data-secondary text-error">{{ actionError }}</p>

    <EmptyState v-if="products.length === 0 && !loading" title="No products yet" />
    <div v-else class="flex flex-col gap-sm">
      <div v-for="product in products" :key="product.id" class="rounded-xl border border-outline-variant/30 bg-surface-container p-4">
        <!-- Edit inline name -->
        <div v-if="editingProductPublicId === product.publicId" class="flex items-center gap-2">
          <input
            v-model="editName"
            class="flex-1 px-3 py-2 rounded-lg border border-surface-variant bg-surface-container-highest text-on-surface text-body-base focus:outline-none focus:border-primary"
            @keydown.enter="handleEditSave(product)"
            @keydown.escape="editingProductPublicId = null"
          >
          <Button size="sm" :disabled="loading" @click="handleEditSave(product)">Save</Button>
          <Button size="sm" variant="outline" @click="editingProductPublicId = null">Cancel</Button>
        </div>

        <!-- Normal view -->
        <div v-else class="flex items-center justify-between">
          <div class="flex-1">
            <p class="text-data-primary text-on-surface">{{ product.name }}</p>
            <p class="text-data-tertiary text-on-surface-variant mt-0.5">
              {{ product.type }}<span v-if="product.cylinderSize"> · {{ product.cylinderSize }}kg</span>
            </p>
          </div>
          <div class="flex gap-1.5 items-center">
            <button
              class="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors"
              title="Edit name"
              @click="startEdit(product)"
            >
              <Icon name="edit" class="text-sm" />
            </button>
            <button
              class="w-8 h-8 rounded-full flex items-center justify-center text-error hover:bg-error/10 transition-colors"
              title="Manage product"
              @click="openManage(product)"
            >
              <Icon name="delete" class="text-sm" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Manage product modal -->
    <div
      v-if="manageProduct"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-8 sm:pb-0"
      @click.self="manageProduct = null"
    >
      <div class="w-full max-w-sm bg-surface-container-high rounded-2xl p-6 space-y-4">
        <div>
          <p class="text-data-primary text-on-surface font-semibold">{{ manageProduct.name }}</p>
          <p class="text-data-tertiary text-on-surface-variant mt-0.5">
            {{ manageProduct.type }}<span v-if="manageProduct.cylinderSize"> · {{ manageProduct.cylinderSize }}kg</span>
          </p>
        </div>

        <p v-if="actionError" class="text-sm text-error">{{ actionError }}</p>

        <!-- Has delivery history — can only hide -->
        <div v-if="productHistoryCount > 0" class="rounded-lg bg-surface-container-highest px-3 py-2">
          <p class="text-data-secondary text-on-surface-variant">
            Used in <span class="font-semibold text-on-surface">{{ productHistoryCount }}</span> deliveries. Cannot delete — will be hidden from the delivery list instead.
          </p>
        </div>

        <!-- No delivery history — can delete -->
        <div v-else class="rounded-lg bg-surface-container-highest px-3 py-2">
          <p class="text-data-secondary text-on-surface-variant">
            No delivery history. This product can be permanently deleted.
          </p>
        </div>

        <div class="flex gap-2 pt-1">
          <button
            class="flex-1 rounded-xl border border-outline-variant/40 py-2.5 text-body-base text-on-surface-variant hover:bg-surface-variant transition-colors"
            @click="manageProduct = null"
          >Cancel</button>
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
      </div>
    </div>
  </div>
</template>
