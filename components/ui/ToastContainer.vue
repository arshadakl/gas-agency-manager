<script setup lang="ts">
const { toasts, removeToast } = useToast()
</script>

<template>
  <div
    class="fixed top-4 inset-x-0 mx-auto z-[9999] flex flex-col items-center gap-2.5 px-4 max-w-[480px] w-full pointer-events-none"
    aria-live="polite"
  >
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto w-full rounded-xl p-3.5 shadow-2xl flex items-start gap-3 backdrop-blur-md transition-all duration-200 border"
        :class="{
          'bg-red-950/95 border-red-500/50 text-red-100': toast.variant === 'destructive',
          'bg-emerald-950/95 border-emerald-500/50 text-emerald-100': toast.variant === 'success',
          'bg-amber-950/95 border-amber-500/50 text-amber-100': toast.variant === 'warning',
          'bg-surface-container-high/95 border-outline-variant/40 text-on-surface': toast.variant === 'default',
        }"
      >
        <!-- Icon -->
        <div class="shrink-0 mt-0.5">
          <Icon
            v-if="toast.variant === 'destructive'"
            name="error"
            class="text-red-400 text-lg"
          />
          <Icon
            v-else-if="toast.variant === 'success'"
            name="check_circle"
            class="text-emerald-400 text-lg"
          />
          <Icon
            v-else-if="toast.variant === 'warning'"
            name="warning"
            class="text-amber-400 text-lg"
          />
          <Icon
            v-else
            name="info"
            class="text-primary text-lg"
          />
        </div>

        <!-- Message & Title -->
        <div class="flex-1 min-w-0">
          <p v-if="toast.title" class="text-xs font-bold uppercase tracking-wider mb-0.5 opacity-90">
            {{ toast.title }}
          </p>
          <p class="text-data-secondary leading-snug break-words">
            {{ toast.message }}
          </p>
        </div>

        <!-- Close button -->
        <button
          type="button"
          class="shrink-0 p-1 rounded-lg opacity-70 hover:opacity-100 transition-opacity"
          @click="removeToast(toast.id)"
          aria-label="Dismiss"
        >
          <Icon name="close" class="text-sm" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(-16px) scale(0.95);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(24px) scale(0.95);
}
</style>
