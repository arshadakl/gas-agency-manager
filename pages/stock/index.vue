<script setup lang="ts">
import { Button } from '~/components/ui/button'
import type { CylinderStock, StockMovement } from '~/types/database'
import type { StockAdjustmentInput } from '~/composables/useInventory'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { user } = useUserSession()
const { fetchCylinderStock, fetchMovements, adjustStock, loading, error } = useInventory()

const stock = ref<CylinderStock[]>([])
const movements = ref<StockMovement[]>([])
const editMode = ref(false)
const adjustmentChanges = ref<Record<number, { fullChange: number; emptyChange: number }>>({})
const { showToast } = useToast()

async function load() {
  const [stockRows, movementRows] = await Promise.all([fetchCylinderStock(), fetchMovements(10)])
  stock.value = stockRows
  movements.value = movementRows
}
onMounted(load)

async function handleQuickAdjust(sizeKg: number, fullChange: number, emptyChange: number) {
  adjustmentChanges.value[sizeKg] = { fullChange, emptyChange }
  await new Promise(resolve => setTimeout(resolve, 500))
  if (adjustmentChanges.value[sizeKg]?.fullChange === fullChange && adjustmentChanges.value[sizeKg]?.emptyChange === emptyChange) {
    const ok = await adjustStock({ sizeKg: sizeKg as any, fullChange, emptyChange })
    if (ok) {
      showToast(`${sizeKg}kg stock updated`)
      await load()
      delete adjustmentChanges.value[sizeKg]
    }
  }
}

function exitEditMode() {
  editMode.value = false
  adjustmentChanges.value = {}
}

const movementIcon = (type: string) => (type === 'purchase' ? 'download' : type === 'delivery' ? 'upload' : 'sync_alt')
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg pb-40">
    <div class="flex justify-between items-center">
      <h1 class="text-headline-md text-on-surface">Cylinder Stock</h1>
      <div v-if="user?.role === 'admin' || user?.role === 'delivery'" class="flex items-center gap-3 bg-surface-container rounded-full px-4 py-2 border border-outline-variant/30">
        <span class="text-data-tertiary text-on-surface-variant">Edit</span>
        <button
          class="w-10 h-6 rounded-full transition-colors"
          :class="editMode ? 'bg-primary-container' : 'bg-surface-container-highest'"
          @click="editMode ? exitEditMode() : (editMode = true)"
        >
          <div class="w-5 h-5 rounded-full bg-surface-container-highest transition-all" :class="editMode ? 'ml-4' : 'ml-0.5'" />
        </button>
      </div>
    </div>

    <div v-if="loading && stock.length === 0" class="flex justify-center py-12">
      <LoadingSpinner />
    </div>

    <template v-else>

      <section class="grid grid-cols-1 gap-md">
        <CylinderStockDetailCard
          v-for="row in stock"
          :key="row.sizeKg"
          :stock="row"
          :edit-mode="editMode"
          @adjust="(fullChange, emptyChange) => handleQuickAdjust(row.sizeKg, fullChange, emptyChange)"
        />
      </section>

      <NuxtLink
        to="/stock/purchases/new"
        class="flex flex-col md:flex-row justify-between items-start md:items-center gap-sm bg-surface-container p-4 rounded-xl"
      >
        <div class="flex items-center gap-2 text-on-surface-variant text-data-secondary">
          <Icon name="local_shipping" class="text-base" />
          Record new purchase from supplier
        </div>
        <Icon name="arrow_forward" class="text-primary-fixed-dim text-lg" />
      </NuxtLink>

      <section class="space-y-md">
        <div class="flex items-center justify-between border-b border-surface-container-highest pb-2">
          <h3 class="text-label-caps text-on-surface-variant tracking-widest uppercase">Stock History</h3>
          <NuxtLink to="/stock/purchases" class="text-data-tertiary text-primary-fixed-dim">Purchase history →</NuxtLink>
        </div>
        <EmptyState v-if="movements.length === 0" title="No stock movements yet" />
        <div v-else class="flex flex-col">
          <div
            v-for="m in movements"
            :key="m.id"
            class="flex items-center gap-md py-3 border-b border-surface-container-highest"
          >
            <div class="bg-surface-variant text-primary-fixed-dim p-2 rounded-full flex items-center justify-center">
              <Icon :name="movementIcon(m.movementType)" :filled="true" />
            </div>
            <div class="flex-1">
              <p class="text-data-secondary text-on-surface">{{ m.sizeKg }}kg · {{ m.movementType }}</p>
              <p class="text-data-tertiary text-on-surface-variant">{{ formatDateTime(m.createdAt) }} · {{ m.createdByName }}</p>
            </div>
            <p class="text-data-tertiary text-on-surface-variant text-right">
              Full {{ m.fullChange >= 0 ? '+' : '' }}{{ m.fullChange }} / Empty {{ m.emptyChange >= 0 ? '+' : '' }}{{ m.emptyChange }}
            </p>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
