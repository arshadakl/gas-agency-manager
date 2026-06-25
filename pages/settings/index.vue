<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { user } = useUserSession()

const links = computed(() => [
  ...(user.value?.role === 'admin' ? [{ to: '/settings/products', label: 'Products & Pricing', icon: 'inventory_2' }] : []),
  ...(user.value?.role === 'admin' ? [{ to: '/settings/users', label: 'Users', icon: 'groups' }] : []),
  { to: '/settings/account', label: 'My Account', icon: 'account_circle' },
])
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-sm">
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
  </div>
</template>
