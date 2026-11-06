<script setup lang="ts">
const { showToast } = useToast()
const { isOnline } = useNetworkStatus()
const { syncPendingDeliveries } = useOfflineQueue()

watch(isOnline, async (online) => {
  if (!online) return
  const pendingBefore = (await useOfflineQueue().getPendingDeliveries()).length
  if (pendingBefore === 0) return
  await syncPendingDeliveries()
  showToast('Offline deliveries synced', 'success')
})
</script>

<template>
  <div class="flex h-dvh flex-col bg-surface text-on-surface max-w-[480px] mx-auto relative">
    <OfflineBanner />
    <AppHeader />
    <main class="flex-1 overflow-y-auto min-h-0">
      <slot />
    </main>
    <BottomNav />
  </div>
</template>
