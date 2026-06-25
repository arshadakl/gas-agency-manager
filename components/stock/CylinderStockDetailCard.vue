<script setup lang="ts">
import type { CylinderStock } from '~/types/database'

const LOW_STOCK_RATIO = 0.3

const props = defineProps<{
  stock: CylinderStock
}>()

const total = computed(() => props.stock.fullCount + props.stock.emptyCount)
const fullPct = computed(() => (total.value > 0 ? (props.stock.fullCount / total.value) * 100 : 0))
const emptyPct = computed(() => (total.value > 0 ? (props.stock.emptyCount / total.value) * 100 : 0))
const isLow = computed(() => total.value > 0 && fullPct.value / 100 < LOW_STOCK_RATIO)
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
          <span class="text-data-primary text-on-surface">{{ stock.fullCount }}</span>
        </div>
        <div class="w-full bg-surface-container-low rounded-full h-2">
          <div class="h-2 rounded-full" :class="isLow ? 'bg-error-container' : 'bg-primary-container'" :style="{ width: `${fullPct}%` }" />
        </div>
      </div>
      <div>
        <div class="flex justify-between items-center mb-1">
          <span class="text-data-secondary text-on-surface-variant">Empty / Returned</span>
          <span class="text-data-primary text-on-surface-variant">{{ stock.emptyCount }}</span>
        </div>
        <div class="w-full bg-surface-container-low rounded-full h-2">
          <div class="bg-surface-variant h-2 rounded-full" :style="{ width: `${emptyPct}%` }" />
        </div>
      </div>
    </div>
  </div>
</template>
