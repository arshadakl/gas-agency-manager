<script setup lang="ts">
defineProps<{
  preview: Array<{
    size: number
    before: { fullCount: number; emptyCount: number }
    after: { fullCount: number; emptyCount: number }
    fullChange: number
    emptyChange: number
    isValid: boolean
  }>
}>()
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="row in preview"
      :key="row.size"
      class="flex items-center justify-between rounded-lg px-3 py-2 text-body-base"
      :class="!row.isValid ? 'bg-error-container/10 border border-error/30' : row.fullChange === 0 && row.emptyChange === 0 ? 'bg-surface-container-highest/50' : 'bg-surface-container-highest'"
    >
      <span class="text-on-surface font-medium">{{ row.size }}kg</span>
      <div class="flex items-center gap-3 text-data-secondary">
        <!-- Full -->
        <span v-if="row.fullChange !== 0" class="flex items-center gap-1">
          <span class="text-on-surface-variant">Full</span>
          <span :class="row.fullChange > 0 ? 'text-emerald-500' : 'text-error'">
            {{ row.before.fullCount }} → {{ row.after.fullCount }}
          </span>
        </span>
        <span v-else class="text-on-surface-variant">Full {{ row.after.fullCount }}</span>
        <!-- Empty -->
        <span v-if="row.emptyChange !== 0" class="flex items-center gap-1">
          <span class="text-on-surface-variant">Empty</span>
          <span :class="row.emptyChange > 0 ? 'text-emerald-500' : row.emptyChange < 0 ? 'text-error' : 'text-on-surface-variant'">
            {{ row.before.emptyCount }} → {{ row.after.emptyCount }}
          </span>
        </span>
        <span v-else class="text-on-surface-variant">Empty {{ row.after.emptyCount }}</span>
      </div>
    </div>
  </div>
</template>
