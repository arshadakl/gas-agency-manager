<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  value: string
  hero?: boolean
  delta?: string
}>(), {
  hero: false,
  delta: '',
})
</script>

<template>
  <div
    :class="[
      'rounded-xl border border-outline-variant/30 relative overflow-hidden h-full flex flex-col justify-between',
      hero ? 'col-span-2 bg-surface-container-high p-5' : 'bg-surface-container-highest p-4',
    ]"
  >
    <p class="text-data-secondary text-on-surface-variant mb-2 leading-snug">{{ label }}</p>
    <div class="flex items-baseline gap-2">
      <span :class="hero ? 'text-display-lg' : 'text-headline-md'" class="text-on-surface leading-none">{{ value }}</span>
      <span v-if="delta" class="flex items-center text-primary-fixed-dim bg-primary-container/10 px-2 py-0.5 rounded-full">
        <span class="text-label-caps">{{ delta }}</span>
      </span>
    </div>
  </div>
</template>
