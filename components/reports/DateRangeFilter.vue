<script setup lang="ts">
import { DATE_PRESETS } from '~/utils/datePresets'

const { preset, customFrom, customTo, setPreset } = useReports()

function handleCustomChange() {
  setPreset('custom')
}
</script>

<template>
  <div class="py-sm space-y-2">
    <div class="flex gap-sm overflow-x-auto pb-1">
      <button
        v-for="p in DATE_PRESETS"
        :key="p.value"
        class="shrink-0 rounded-full px-4 py-2 text-data-secondary whitespace-nowrap transition-colors"
        :class="preset === p.value ? 'bg-primary-container text-on-primary-container font-bold border border-primary-container' : 'border border-outline text-on-surface-variant'"
        @click="setPreset(p.value)"
      >
        {{ p.label }}
      </button>
    </div>
    <div v-if="preset === 'custom'" class="flex items-end gap-3">
      <div class="flex-1 min-w-0">
        <label class="text-data-tertiary text-on-surface-variant text-xs block mb-1">Start Date</label>
        <input v-model="customFrom" type="date" class="w-full rounded-lg border border-outline-variant bg-surface-container-highest px-0 py-2 text-body-base text-on-surface" @change="handleCustomChange" />
      </div>
      <div class="flex-1 min-w-0">
        <label class="text-data-tertiary text-on-surface-variant text-xs block mb-1">End Date</label>
        <input v-model="customTo" type="date" class="w-full rounded-lg border border-outline-variant bg-surface-container-highest px-0 py-2 text-body-base text-on-surface" @change="handleCustomChange" />
      </div>
    </div>
  </div>
</template>
