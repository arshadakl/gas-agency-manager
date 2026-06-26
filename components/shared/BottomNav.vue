<script setup lang="ts">
import { ROLES, type Role } from '~/types'

const route = useRoute()
const { user } = useUserSession()

// 6 primary nav items (scales to visible tabs based on role)
const items = [
  { to: '/', label: 'Home', icon: 'home', roles: [ROLES.ADMIN, ROLES.DELIVERY, ROLES.VIEWER] },
  { to: '/deliveries', label: 'Deliveries', icon: 'local_shipping', roles: [ROLES.ADMIN, ROLES.DELIVERY, ROLES.VIEWER] },
  { to: '/stock', label: 'Stock', icon: 'inventory_2', roles: [ROLES.ADMIN, ROLES.DELIVERY, ROLES.VIEWER] },
  { to: '/customers', label: 'Customers', icon: 'groups', roles: [ROLES.ADMIN, ROLES.DELIVERY, ROLES.VIEWER] },
  { to: '/orders', label: 'Orders', icon: 'event_note', roles: [ROLES.ADMIN, ROLES.DELIVERY, ROLES.VIEWER] },
  { to: '/reports', label: 'Reports', icon: 'analytics', roles: [ROLES.ADMIN, ROLES.VIEWER] },
] satisfies Array<{ to: string; label: string; icon: string; roles: Role[] }>

const visibleItems = computed(() => items.filter((item) => !user.value || item.roles.includes(user.value.role)))

function isActive(to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}
</script>

<template>
  <nav class="fixed bottom-0 inset-x-0 mx-auto max-w-[480px] z-40 flex justify-around items-center rounded-t-xl bg-surface-container-high py-2 px-2 shadow-[0_-4px_24px_rgba(0,0,0,0.5)]">
    <NuxtLink
      v-for="item in visibleItems"
      :key="item.to"
      :to="item.to"
      :class="[
        'flex flex-col items-center justify-center px-4 py-1 transition-all active:scale-90',
        isActive(item.to) ? 'bg-primary-container text-on-primary-container rounded-full' : 'text-on-surface-variant hover:text-primary-fixed-dim',
      ]"
    >
      <Icon :name="item.icon" :filled="isActive(item.to)" />
      <span class="font-bold text-label-caps mt-1">{{ item.label }}</span>
    </NuxtLink>
  </nav>
</template>
