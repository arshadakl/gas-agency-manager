<script setup lang="ts">
import { DATE_PRESETS } from '~/utils/datePresets'
import type { DatePreset } from '~/utils/datePresets'

const props = defineProps<{
  maxMonths?: number | null
}>()

const { preset, customFrom, customTo, setPreset } = useReports()

const PRESET_MONTHS: Record<DatePreset, number> = {
  today: 0,
  this_week: 0.25,
  this_month: 1,
  '3_months': 3,
  '6_months': 6,
  this_year: 12,
  custom: 999,
}

const visiblePresets = computed(() => {
  if (props.maxMonths == null) return DATE_PRESETS
  return DATE_PRESETS.filter(p => PRESET_MONTHS[p.value] <= props.maxMonths!)
})

function handleCustomChange() {
  setPreset('custom')
}
</script>

<template>
  <div class="py-sm space-y-2">
    <div class="flex gap-sm overflow-x-auto pb-1">
      <button
        v-for="p in visiblePresets"
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
