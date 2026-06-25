<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
}>(), {
  title: 'Super gas',
})

const { logout } = useAuth()

async function handleLogout() {
  await logout()
}
</script>

<template>
  <header class="sticky top-0 z-40 flex items-center justify-between bg-surface-container-low px-margin-mobile h-16 shadow-sm">
    <div class="flex items-center gap-sm">
      <div class="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high text-primary-fixed-dim">
        <Icon name="local_gas_station" class="text-lg" />
      </div>
      <h1 class="font-bold text-headline-md text-primary-fixed-dim tracking-tight truncate">{{ title }}</h1>
    </div>
    <div class="flex items-center gap-1">
      <NuxtLink
        to="/settings"
        aria-label="Settings"
        class="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-variant active:scale-95"
      >
        <Icon name="settings" />
      </NuxtLink>
      <button
        aria-label="Logout"
        class="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-variant active:scale-95"
        @click="handleLogout"
      >
        <Icon name="logout" />
      </button>
    </div>
  </header>
</template>
