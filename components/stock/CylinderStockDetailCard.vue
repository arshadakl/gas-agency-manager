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

const localFullCount = ref(props.stock.fullCount)
const localEmptyCount = ref(props.stock.emptyCount)

watch(() => props.stock, (newStock) => {
  localFullCount.value = newStock.fullCount
  localEmptyCount.value = newStock.emptyCount
}, { deep: true })

const total = computed(() => localFullCount.value + localEmptyCount.value)
const fullPct = computed(() => (total.value > 0 ? (localFullCount.value / total.value) * 100 : 0))
const emptyPct = computed(() => (total.value > 0 ? (localEmptyCount.value / total.value) * 100 : 0))
const isLow = computed(() => total.value > 0 && fullPct.value / 100 < LOW_STOCK_RATIO)

function incFull() {
  localFullCount.value++
  emit('adjust', localFullCount.value - props.stock.fullCount, 0)
}

function decFull() {
  if (localFullCount.value > 0) {
    localFullCount.value--
    emit('adjust', localFullCount.value - props.stock.fullCount, 0)
  }
}

function incEmpty() {
  localEmptyCount.value++
  emit('adjust', 0, localEmptyCount.value - props.stock.emptyCount)
}

function decEmpty() {
  if (localEmptyCount.value > 0) {
    localEmptyCount.value--
    emit('adjust', 0, localEmptyCount.value - props.stock.emptyCount)
  }
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
          <div class="flex items-center gap-2">
            <span class="text-data-primary text-on-surface">{{ localFullCount }}</span>
            <div v-if="editMode" class="flex items-center gap-1 bg-surface-container-highest rounded p-0.5">
              <button
                type="button"
                class="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-variant transition-colors"
                @click="decFull"
              >
                <Icon name="remove" class="text-sm" />
              </button>
              <button
                type="button"
                class="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-variant transition-colors"
                @click="incFull"
              >
                <Icon name="add" class="text-sm" />
              </button>
            </div>
          </div>
        </div>
        <div class="w-full bg-surface-container-low rounded-full h-2">
          <div class="h-2 rounded-full" :class="isLow ? 'bg-error-container' : 'bg-primary-container'" :style="{ width: `${fullPct}%` }" />
        </div>
      </div>
      <div>
        <div class="flex justify-between items-center mb-1">
          <span class="text-data-secondary text-on-surface-variant">Empty / Returned</span>
          <div class="flex items-center gap-2">
            <span class="text-data-primary text-on-surface-variant">{{ localEmptyCount }}</span>
            <div v-if="editMode" class="flex items-center gap-1 bg-surface-container-highest rounded p-0.5">
              <button
                type="button"
                class="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-variant transition-colors"
                @click="decEmpty"
              >
                <Icon name="remove" class="text-sm" />
              </button>
              <button
                type="button"
                class="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-variant transition-colors"
                @click="incEmpty"
              >
                <Icon name="add" class="text-sm" />
              </button>
            </div>
          </div>
        </div>
        <div class="w-full bg-surface-container-low rounded-full h-2">
          <div class="bg-surface-variant h-2 rounded-full" :style="{ width: `${emptyPct}%` }" />
        </div>
      </div>
    </div>
  </div>
</template>
