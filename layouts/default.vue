<script setup lang="ts">
const { toasts, showToast } = useToast()
const { isOnline } = useNetworkStatus()
const { syncPendingDeliveries } = useOfflineQueue()

watch(isOnline, async (online) => {
  if (!online) return
  const pendingBefore = (await useOfflineQueue().getPendingDeliveries()).length
  if (pendingBefore === 0) return
  await syncPendingDeliveries()
  showToast('Offline deliveries synced')
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface text-on-surface max-w-[480px] mx-auto relative overflow-x-hidden pb-24">
    <OfflineBanner />
    <AppHeader />
    <main class="flex-1">
      <slot />
    </main>
    <BottomNav />

    <div class="fixed top-20 inset-x-0 z-50 flex flex-col items-center gap-2 px-4">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="[
          'rounded-lg px-4 py-2 text-data-secondary text-data-secondary shadow-lg text-on-surface',
          toast.variant === 'destructive' ? 'bg-error-container' : 'bg-surface-container-highest',
        ]"
      >
        {{ toast.message }}
      </div>
    </div>
  </div>
</template>
