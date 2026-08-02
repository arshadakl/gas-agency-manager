<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { CYLINDER_SIZES } from '~/types'
import type { Product, NewProduct } from '~/types/database'
import type { CylinderSize } from '~/types'

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
const showDeleteConfirm = ref(false)

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

function handleDelete() {
  showDeleteConfirm.value = true
}

async function confirmDeleteProduct() {
  showDeleteConfirm.value = false
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

// ── Own Cylinders ────────────────────────────────────────────────────
const ownStock = ref<Array<{ sizeKg: number; ownCount: number }>>([])
const showOwnForm = ref(false)
const ownSize = ref<CylinderSize>(17)
const ownCount = ref<number>(1)
const ownAmount = ref<number>(0)
const ownDebit = ref(false)
const ownPaymentSource = ref<'cash' | 'bank'>('cash')
const ownSubmitting = ref(false)

async function loadOwnStock() {
  try {
    const res = await $fetch<{ data: { bySize: Array<{ sizeKg: number; ownCount: number }> } }>('/api/inventory/own-cylinders')
    ownStock.value = res.data.bySize
  } catch { /* ignore */ }
}
onMounted(loadOwnStock)

async function handleAddOwn() {
  if (ownCount.value < 1 || ownAmount.value < 0) return
  ownSubmitting.value = true
  try {
    await $fetch('/api/inventory/own-cylinders', {
      method: 'POST',
      body: {
        sizeKg: ownSize.value,
        count: ownCount.value,
        amount: ownAmount.value,
        debitFromAccount: ownDebit.value,
        paymentSource: ownPaymentSource.value,
      },
    })
    showToast(`${ownCount.value} × ${ownSize.value}kg own cylinders added`)
    showOwnForm.value = false
    ownCount.value = 1
    ownAmount.value = 0
    ownDebit.value = false
    ownPaymentSource.value = 'cash'
    await loadOwnStock()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : (e as { data?: { message?: string } })?.data?.message || 'Failed to add'
    showToast(msg, 'destructive')
  } finally {
    ownSubmitting.value = false
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

    <ConfirmDialog
      :open="showDeleteConfirm"
      title="Delete product?"
      message="This product will be permanently removed. Any existing deliveries using this product will still show it, but you won't be able to create new ones."
      confirm-text="Yes, Delete"
      :destructive="true"
      @confirm="confirmDeleteProduct"
      @cancel="showDeleteConfirm = false"
    />

    <!-- Own Cylinders -->
    <div class="rounded-xl bg-surface-container p-4 border border-outline-variant/20">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <Icon name="inventory_2" class="text-primary-fixed-dim" />
          <span class="text-data-primary text-on-surface">Own Cylinders</span>
        </div>
        <button
          v-if="!showOwnForm"
          class="rounded-full bg-primary-container px-3 py-1 text-label-caps text-on-primary-container font-semibold hover:opacity-90"
          @click="showOwnForm = true"
        >
          + Add
        </button>
      </div>

      <!-- Current counts -->
      <div class="grid grid-cols-2 gap-2">
        <div v-for="row in ownStock.filter(r => r.ownCount > 0)" :key="row.sizeKg" class="flex items-center justify-between bg-surface-container-high rounded-lg px-3 py-2">
          <span class="text-data-secondary text-on-surface-variant">{{ row.sizeKg }}kg</span>
          <span class="text-data-primary text-on-surface font-semibold">{{ row.ownCount }}</span>
        </div>
      </div>
      <p v-if="ownStock.length && ownStock.every(r => r.ownCount === 0)" class="text-data-tertiary text-on-surface-variant text-center py-2">No own cylinders recorded</p>

      <!-- Add form -->
      <div v-if="showOwnForm" class="mt-3 pt-3 border-t border-outline-variant/20 space-y-3">
        <div>
          <label class="text-label-caps text-on-surface-variant mb-1 block">Size</label>
          <div class="flex gap-2">
            <button
              v-for="size in CYLINDER_SIZES"
              :key="size"
              class="flex-1 rounded-lg py-2 text-data-secondary border transition-colors"
              :class="ownSize === size ? 'bg-primary-container text-on-primary-container border-primary-container' : 'bg-surface-container-high text-on-surface-variant border-outline-variant/20'"
              @click="ownSize = size"
            >{{ size }}kg</button>
          </div>
        </div>
        <div class="flex gap-3">
          <div class="flex-1">
            <label class="text-label-caps text-on-surface-variant mb-1 block">Count</label>
            <input v-model.number="ownCount" type="number" min="1" class="w-full rounded-lg bg-surface-container-highest px-3 py-2 text-data-primary text-on-surface border border-outline-variant/20 outline-none focus:border-primary-container" />
          </div>
          <div class="flex-1">
            <label class="text-label-caps text-on-surface-variant mb-1 block">Amount (₹)</label>
            <input v-model.number="ownAmount" type="number" min="0" class="w-full rounded-lg bg-surface-container-highest px-3 py-2 text-data-primary text-on-surface border border-outline-variant/20 outline-none focus:border-primary-container" />
          </div>
        </div>
        <!-- Debit from account -->
        <label class="flex items-center gap-3 cursor-pointer">
          <div class="relative">
            <input v-model="ownDebit" type="checkbox" class="peer sr-only" />
            <div class="w-10 h-5 rounded-full bg-surface-container-highest border border-outline-variant/30 peer-checked:bg-primary-container transition-colors" />
            <div class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-on-surface-variant peer-checked:translate-x-5 peer-checked:bg-on-primary-container transition-all" />
          </div>
          <span class="text-data-secondary text-on-surface-variant">Debit from account</span>
        </label>
        <div v-if="ownDebit" class="flex gap-2">
          <button
            class="flex-1 rounded-lg py-2 text-data-secondary border transition-colors"
            :class="ownPaymentSource === 'cash' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-surface-container-high text-on-surface-variant border-outline-variant/20'"
            @click="ownPaymentSource = 'cash'"
          >Cash</button>
          <button
            class="flex-1 rounded-lg py-2 text-data-secondary border transition-colors"
            :class="ownPaymentSource === 'bank' ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' : 'bg-surface-container-high text-on-surface-variant border-outline-variant/20'"
            @click="ownPaymentSource = 'bank'"
          >Bank</button>
        </div>
        <div class="flex gap-2">
          <button class="flex-1 rounded-xl border border-outline-variant/40 py-2.5 text-body-base text-on-surface-variant hover:bg-surface-variant transition-colors" @click="showOwnForm = false">Cancel</button>
          <button class="flex-1 rounded-xl bg-primary-container text-on-primary-container py-2.5 text-body-base font-semibold hover:opacity-90 transition-opacity disabled:opacity-50" :disabled="ownSubmitting || ownCount < 1" @click="handleAddOwn">
            <LoadingSpinner v-if="ownSubmitting" class="h-4 w-4 mx-auto" />
            <span v-else>Add</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
