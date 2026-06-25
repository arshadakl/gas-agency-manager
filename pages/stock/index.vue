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
const showAdjustForm = ref(false)

async function load() {
  const [stockRows, movementRows] = await Promise.all([fetchCylinderStock(), fetchMovements(10)])
  stock.value = stockRows
  movements.value = movementRows
}
onMounted(load)

async function handleAdjust(data: StockAdjustmentInput) {
  const ok = await adjustStock(data)
  if (ok) {
    showAdjustForm.value = false
    await load()
  }
}

const movementIcon = (type: string) => (type === 'purchase' ? 'download' : type === 'delivery' ? 'upload' : 'sync_alt')
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg">
    <div class="flex justify-between items-end">
      <h1 class="text-headline-md text-on-surface">Cylinder Stock</h1>
      <Button v-if="user?.role === 'admin'" size="sm" class="rounded-full" @click="showAdjustForm = !showAdjustForm">
        <Icon name="add" class="text-base mr-1" /> Update Stock
      </Button>
    </div>

    <div v-if="loading && stock.length === 0" class="flex justify-center py-12">
      <LoadingSpinner />
    </div>

    <template v-else>
      <StockAdjustForm
        v-if="showAdjustForm"
        :loading="loading"
        :error="error"
        @submit="handleAdjust"
        @cancel="showAdjustForm = false"
      />

      <section class="grid grid-cols-1 gap-md">
        <CylinderStockDetailCard v-for="row in stock" :key="row.sizeKg" :stock="row" />
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
