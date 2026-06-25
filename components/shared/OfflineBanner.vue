<script setup lang="ts">
const { isOnline } = useNetworkStatus()
</script>

<template>
  <div v-if="!isOnline" class="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-white">
    <Icon name="wifi_off" class="text-base" />
    You are offline — changes will sync when connected
  </div>
</template>
