<script setup lang="ts">
defineProps<{
  preview: Array<{
    size: number
    before: { fullCount: number }
    after: { fullCount: number }
    fullChange: number
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
      :class="!row.isValid ? 'bg-error-container/10 border border-error/30' : row.fullChange === 0 ? 'bg-surface-container-highest/50' : 'bg-surface-container-highest'"
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
      </div>
    </div>
  </div>
</template>
