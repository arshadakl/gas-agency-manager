<script setup lang="ts">
import type { CylinderStock } from '~/types/database'

const LOW_STOCK_THRESHOLD = 10

defineProps<{
  stock: CylinderStock[]
}>()
</script>

<template>
  <div class="rounded-xl border border-outline-variant/50 bg-surface-container overflow-hidden">
    <div class="grid grid-cols-3 gap-xs p-3 border-b border-outline-variant/30 bg-surface-container-high">
      <div class="text-label-caps text-on-surface-variant pl-2">Size</div>
      <div class="text-label-caps text-on-surface-variant text-center flex items-center justify-center gap-1">
        <div class="w-2 h-2 rounded-full bg-primary-container" /> Full
      </div>
      <div class="text-label-caps text-on-surface-variant text-center flex items-center justify-center gap-1">
        <div class="w-2 h-2 rounded-full border border-outline" /> Empty
      </div>
    </div>
    <div class="divide-y divide-outline-variant/20">
      <div v-for="row in stock" :key="row.sizeKg" class="grid grid-cols-3 gap-xs p-3 items-center hover:bg-surface-container-highest transition-colors">
        <div class="text-data-secondary text-on-surface pl-2">{{ row.sizeKg }}kg</div>
        <div class="text-data-primary text-primary-fixed-dim text-center">{{ row.fullCount }}</div>
        <div class="text-data-primary text-on-surface-variant text-center">{{ row.emptyCount }}</div>
      </div>
    </div>
    <p
      v-for="row in stock.filter((r) => r.fullCount < LOW_STOCK_THRESHOLD)"
      :key="`warn-${row.sizeKg}`"
      class="px-4 py-2 text-data-tertiary text-error bg-error-container/20"
    >
      Low stock warning: only {{ row.fullCount }} full {{ row.sizeKg }}kg cylinders left
    </p>
  </div>
</template>
