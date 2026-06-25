<script setup lang="ts">
import { DATE_PRESETS } from '~/utils/datePresets'

const { preset, customFrom, customTo, setPreset } = useReports()

function handleCustomChange() {
  setPreset('custom')
}
</script>

<template>
  <div class="sticky top-16 z-20 bg-background/90 backdrop-blur-md py-sm space-y-2 -mx-margin-mobile px-margin-mobile">
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
    <div v-if="preset === 'custom'" class="flex gap-2">
      <input v-model="customFrom" type="date" class="flex-1 rounded-lg border border-outline-variant bg-surface-container-highest px-3 py-2 text-body-base text-on-surface" @change="handleCustomChange" />
      <input v-model="customTo" type="date" class="flex-1 rounded-lg border border-outline-variant bg-surface-container-highest px-3 py-2 text-body-base text-on-surface" @change="handleCustomChange" />
    </div>
  </div>
</template>
