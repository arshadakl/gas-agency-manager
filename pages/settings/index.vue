<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { user } = useUserSession()
const { theme, toggleTheme } = useTheme()
const { isInstallable, isInstalled, install } = usePwaInstall()

const links = computed(() => [
  ...(user.value?.role === 'admin' || user.value?.role === 'delivery' ? [{ to: '/settings/products', label: 'Products & Pricing', icon: 'inventory_2' }] : []),
  ...(user.value?.role === 'admin' || user.value?.role === 'delivery' ? [{ to: '/reports', label: 'Reports', icon: 'analytics' }] : []),
  ...(user.value?.role === 'admin' ? [{ to: '/settings/users', label: 'Users', icon: 'groups' }] : []),
  { to: '/settings/account', label: 'My Account', icon: 'account_circle' },
])
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-sm pb-40">
    <h1 class="text-headline-md text-on-surface mb-sm">Settings</h1>

    <NuxtLink
      v-for="link in links"
      :key="link.to"
      :to="link.to"
      class="flex items-center gap-3 rounded-xl bg-surface-container p-4 border border-outline-variant/20 hover:border-outline-variant/40 transition-colors"
    >
      <Icon :name="link.icon" class="text-primary-fixed-dim" />
      <span class="text-data-primary text-on-surface">{{ link.label }}</span>
      <Icon name="chevron_right" class="text-on-surface-variant ml-auto" />
    </NuxtLink>

    <!-- Install app -->
    <button
      v-if="isInstallable"
      class="flex items-center gap-3 rounded-xl bg-primary-container/20 p-4 border border-primary-container/40 hover:bg-primary-container/30 transition-colors w-full text-left"
      @click="install"
    >
      <Icon name="install_mobile" class="text-primary-fixed-dim" />
      <div class="flex-1">
        <span class="text-data-primary text-on-surface">Install App</span>
        <p class="text-data-tertiary text-on-surface-variant mt-0.5">Add SuperGas to your home screen</p>
      </div>
      <Icon name="download" class="text-primary-fixed-dim ml-auto" />
    </button>
    <div
      v-else-if="isInstalled"
      class="flex items-center gap-3 rounded-xl bg-success/10 p-4 border border-success/20"
    >
      <Icon name="check_circle" class="text-success" />
      <span class="text-data-primary text-on-surface">App installed</span>
    </div>

    <!-- Theme toggle -->
    <button
      class="flex items-center gap-3 rounded-xl bg-surface-container p-4 border border-outline-variant/20 hover:border-outline-variant/40 transition-colors w-full text-left"
      @click="toggleTheme"
    >
      <Icon :name="theme === 'dark' ? 'dark_mode' : 'light_mode'" class="text-primary-fixed-dim" />
      <div class="flex-1">
        <span class="text-data-primary text-on-surface">Theme</span>
        <p class="text-data-tertiary text-on-surface-variant mt-0.5">
          {{ theme === 'dark' ? 'Dark — tap to switch to Light' : 'Light — tap to switch to Dark' }}
        </p>
      </div>
      <div
        class="w-12 h-6 rounded-full transition-colors flex items-center px-1"
        :class="theme === 'light' ? 'bg-tertiary-container' : 'bg-surface-container-highest'"
      >
        <div
          class="w-4 h-4 rounded-full bg-on-surface transition-all"
          :class="theme === 'light' ? 'translate-x-6' : 'translate-x-0'"
        />
      </div>
    </button>
  </div>
</template>
