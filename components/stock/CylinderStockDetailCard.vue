<script setup lang="ts">
import type { CylinderStock } from '~/types/database'

const LOW_STOCK_RATIO = 0.3

const props = defineProps<{
  stock: CylinderStock
  editMode?: boolean
}>()

const emit = defineEmits<{
  adjust: [fullChange: number, emptyChange: number]
}>()

const inputFull = ref(props.stock.fullCount)
const inputEmpty = ref(props.stock.emptyCount)

watch(() => props.stock, (newStock) => {
  inputFull.value = newStock.fullCount
  inputEmpty.value = newStock.emptyCount
}, { deep: true })

const total = computed(() => inputFull.value + inputEmpty.value)
const fullPct = computed(() => (total.value > 0 ? (inputFull.value / total.value) * 100 : 0))
const emptyPct = computed(() => (total.value > 0 ? (inputEmpty.value / total.value) * 100 : 0))
const isLow = computed(() => total.value > 0 && fullPct.value / 100 < LOW_STOCK_RATIO)

function handleFullChange() {
  const delta = inputFull.value - props.stock.fullCount
  if (delta !== 0) emit('adjust', delta, 0)
}

function handleEmptyChange() {
  const delta = inputEmpty.value - props.stock.emptyCount
  if (delta !== 0) emit('adjust', 0, delta)
}

function clampFull() {
  if (inputFull.value < 0) inputFull.value = 0
  handleFullChange()
}

function clampEmpty() {
  if (inputEmpty.value < 0) inputEmpty.value = 0
  handleEmptyChange()
}
</script>

<template>
  <div class="bg-surface-container rounded-xl p-[20px] flex flex-col gap-md border border-surface-container-low shadow-sm">
    <div class="flex justify-between items-center">
      <h2 class="text-headline-md text-primary-fixed-dim">{{ stock.sizeKg }}kg</h2>
      <span class="bg-surface-variant text-on-surface-variant text-label-caps px-3 py-1 rounded-full uppercase tracking-wider">{{ total }} total</span>
    </div>
    <div class="space-y-sm">
      <div>
        <div class="flex justify-between items-center mb-1">
          <span class="text-data-secondary text-on-surface">Full / Ready</span>
          <div v-if="editMode" class="flex items-center gap-2">
            <input
              v-model.number="inputFull"
              type="number"
              inputmode="numeric"
              min="0"
              step="1"
              class="w-20 text-center px-2 py-1 border border-outline-variant/50 rounded-lg bg-surface-container-highest text-on-surface text-body-base focus:outline-none focus:border-primary"
              @change="clampFull"
            >
          </div>
          <span v-else class="text-data-primary text-on-surface">{{ inputFull }}</span>
        </div>
        <div class="w-full bg-surface-container-low rounded-full h-2">
          <div class="h-2 rounded-full" :class="isLow ? 'bg-error-container' : 'bg-primary-container'" :style="{ width: `${fullPct}%` }" />
        </div>
      </div>
      <div>
        <div class="flex justify-between items-center mb-1">
          <span class="text-data-secondary text-on-surface-variant">Empty / Returned</span>
          <div v-if="editMode" class="flex items-center gap-2">
            <input
              v-model.number="inputEmpty"
              type="number"
              inputmode="numeric"
              min="0"
              step="1"
              class="w-20 text-center px-2 py-1 border border-outline-variant/50 rounded-lg bg-surface-container-highest text-on-surface-variant text-body-base focus:outline-none focus:border-primary"
              @change="clampEmpty"
            >
          </div>
          <span v-else class="text-data-primary text-on-surface-variant">{{ inputEmpty }}</span>
        </div>
        <div class="w-full bg-surface-container-low rounded-full h-2">
          <div class="bg-surface-variant h-2 rounded-full" :style="{ width: `${emptyPct}%` }" />
        </div>
      </div>
    </div>
  </div>
</template>
