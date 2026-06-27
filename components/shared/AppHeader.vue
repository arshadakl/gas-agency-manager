<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
}>(), {
  title: 'Tuvvur Super gas',
})

const route = useRoute()
const segments = computed(() => route.path.split('/').filter(Boolean))
const isSubRoute = computed(() => segments.value.length >= 2)
const parentPath = computed(() => {
  const segs = segments.value
  if (segs.length === 0) return '/'
  return '/' + segs.slice(0, -1).join('/')
})
</script>

<template>
  <header class="sticky top-0 z-40 flex items-center justify-between bg-surface-container-low px-margin-mobile h-16 shadow-sm">
    <div class="flex items-center gap-sm">
      <div class="flex h-8 w-8 items-center justify-center text-primary-fixed-dim shrink-0">
        <AppLogo :size="32" />
      </div>
      <h1 class="font-bold text-headline-md text-primary-fixed-dim tracking-tight truncate">{{ title }}</h1>
    </div>
    <div class="flex items-center gap-1">
      <NuxtLink
        v-if="isSubRoute"
        :to="parentPath"
        aria-label="Back"
        class="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-variant active:scale-95"
      >
        <Icon name="arrow_back" />
      </NuxtLink>
      <NuxtLink
        v-else
        to="/settings"
        aria-label="Settings"
        class="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-variant active:scale-95"
      >
        <Icon name="settings" />
      </NuxtLink>
    </div>
  </header>
</template>
