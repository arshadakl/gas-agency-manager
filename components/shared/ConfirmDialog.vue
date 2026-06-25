<script setup lang="ts">
const props = withDefaults(defineProps<{
  open: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  destructive?: boolean
}>(), {
  title: 'Are you sure?',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  destructive: false,
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  emit('cancel')
}
</script>

<template>
  <div v-if="props.open" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
    <div class="w-full max-w-sm rounded-lg bg-card p-5 shadow-lg">
      <h2 class="text-base font-semibold text-foreground">{{ props.title }}</h2>
      <p v-if="props.message" class="mt-2 text-sm text-muted-foreground">{{ props.message }}</p>
      <div class="mt-5 flex gap-3">
        <button
          class="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium"
          @click="handleCancel"
        >
          {{ props.cancelText }}
        </button>
        <button
          :class="[
            'flex-1 rounded-md px-4 py-2 text-sm font-medium text-white',
            props.destructive ? 'bg-destructive' : 'bg-primary',
          ]"
          @click="handleConfirm"
        >
          {{ props.confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>
