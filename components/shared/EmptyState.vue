<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  description?: string
}>(), {
  title: 'No data yet',
  description: '',
})
</script>

<template>
  <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
    <Icon name="inbox" class="text-[40px] text-muted-foreground mb-3" />
    <p class="text-sm font-medium text-foreground">{{ title }}</p>
    <p v-if="description" class="text-sm text-muted-foreground mt-1">{{ description }}</p>
    <slot />
  </div>
</template>
