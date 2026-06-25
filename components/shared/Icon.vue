<script setup lang="ts">
withDefaults(defineProps<{
  name: string
  filled?: boolean
}>(), {
  filled: false,
})
</script>

<template>
  <span class="material-symbols-outlined" :class="filled && 'fill'">{{ name }}</span>
</template>
