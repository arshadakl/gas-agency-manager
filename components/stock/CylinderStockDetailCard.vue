<script setup lang="ts">
import type { CylinderStock } from '~/types/database'

const LOW_STOCK_THRESHOLD = 10

const props = defineProps<{
  stock: CylinderStock
  editMode?: boolean
}>()

const emit = defineEmits<{
  adjust: [fullChange: number]
}>()

const inputFull = ref(props.stock.fullCount)

watch(() => props.stock, (newStock) => {
  inputFull.value = newStock.fullCount
}, { deep: true })

const isLow = computed(() => inputFull.value < LOW_STOCK_THRESHOLD)

function handleFullChange() {
  const delta = inputFull.value - props.stock.fullCount
  if (delta !== 0) emit('adjust', delta)
}

function clampFull() {
  if (inputFull.value < 0) inputFull.value = 0
  handleFullChange()
}
</script>

<template>
  <div class="bg-surface-container rounded-xl p-[20px] flex flex-col gap-md border border-surface-container-low shadow-sm">
    <div class="flex justify-between items-center">
      <h2 class="text-headline-md text-primary-fixed-dim">{{ stock.sizeKg }}kg</h2>
      <span v-if="stock.ownCount > 0" class="bg-surface-variant text-on-surface-variant text-label-caps px-3 py-1 rounded-full uppercase tracking-wider">
        {{ stock.ownCount }} owned
      </span>
    </div>
    <div class="space-y-sm">
      <div>
        <div class="flex justify-between items-center mb-1">
          <span class="text-data-secondary text-on-surface font-medium">Full Cylinders in Stock</span>
          <div v-if="editMode" class="flex items-center gap-2">
            <input
              v-model.number="inputFull"
              type="number"
              inputmode="numeric"
              min="0"
              step="1"
              class="w-20 text-center px-2 py-1 border border-outline-variant/50 rounded-lg bg-surface-container-highest text-on-surface text-body-base focus:outline-none focus:border-primary font-bold"
              @change="clampFull"
            >
          </div>
          <span v-else class="text-data-primary text-primary-fixed-dim font-bold text-xl">{{ inputFull }}</span>
        </div>
        <div class="w-full bg-surface-container-low rounded-full h-2 overflow-hidden">
          <div
            class="h-2 rounded-full transition-all"
            :class="isLow ? 'bg-error' : 'bg-primary-container'"
            :style="{ width: `${Math.min(100, Math.max(5, (inputFull / 50) * 100))}%` }"
          />
        </div>
      </div>
      <p v-if="isLow" class="text-data-tertiary text-error mt-1">
        Low stock warning (&lt; {{ LOW_STOCK_THRESHOLD }} full cylinders left)
      </p>
    </div>
  </div>
</template>
