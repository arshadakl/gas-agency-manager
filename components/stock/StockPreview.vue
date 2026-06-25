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
  <div class="w-full overflow-x-auto">
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b border-surface-container-highest">
          <th class="py-2 text-label-caps text-on-surface-variant uppercase">Type / Size</th>
          <th class="py-2 text-label-caps text-on-surface-variant uppercase text-right">Current</th>
          <th class="py-2 text-label-caps text-on-surface-variant uppercase text-right">Change</th>
          <th class="py-2 text-label-caps text-on-surface-variant uppercase text-right">After</th>
        </tr>
      </thead>
      <tbody class="text-body-base">
        <template v-for="row in preview" :key="row.size">
          <tr class="border-b border-surface-container-highest/50" :class="!row.isValid && 'bg-error-container/10'">
            <td class="py-3 text-on-surface">{{ row.size }}kg <span class="text-on-surface-variant text-[10px]">FULL</span></td>
            <td class="py-3 text-right text-on-surface-variant">{{ row.before.fullCount }}</td>
            <td class="py-3 text-right text-tertiary">{{ row.fullChange >= 0 ? '+' : '' }}{{ row.fullChange }}</td>
            <td class="py-3 text-right font-medium" :class="!row.isValid ? 'text-error' : 'text-on-surface'">{{ row.after.fullCount }}</td>
          </tr>
          <tr class="border-b border-surface-container-highest/50" :class="!row.isValid && 'bg-error-container/10'">
            <td class="py-3 text-on-surface">{{ row.size }}kg <span class="text-on-surface-variant text-[10px]">MT</span></td>
            <td class="py-3 text-right text-on-surface-variant">{{ row.before.emptyCount }}</td>
            <td class="py-3 text-right text-primary-fixed-dim">{{ row.emptyChange >= 0 ? '+' : '' }}{{ row.emptyChange }}</td>
            <td class="py-3 text-right font-medium" :class="!row.isValid ? 'text-error' : 'text-on-surface'">{{ row.after.emptyCount }}</td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
