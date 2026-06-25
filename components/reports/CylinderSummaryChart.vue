<script setup lang="ts">
const props = defineProps<{
  breakdown: Array<{ cylinderSize: number | null; totalQuantity: number }>
}>()

const max = computed(() => Math.max(1, ...props.breakdown.map((b) => b.totalQuantity)))
</script>

<template>
  <div class="space-y-4">
    <div v-for="row in breakdown" :key="row.cylinderSize ?? 'other'" class="space-y-1">
      <div class="flex justify-between text-data-secondary">
        <span class="text-on-surface">{{ row.cylinderSize }}kg</span>
        <span class="text-primary-fixed-dim font-bold">{{ row.totalQuantity }}</span>
      </div>
      <div class="w-full bg-surface-container-highest rounded-full h-2">
        <div class="bg-primary-container h-2 rounded-full" :style="{ width: `${(row.totalQuantity / max) * 100}%` }" />
      </div>
    </div>
  </div>
</template>
