<script setup lang="ts">
import { ROLES, type Role } from '~/types'

const route = useRoute()
const { user } = useUserSession()

const items = [
  { to: '/', label: 'Home', icon: 'home', roles: [ROLES.ADMIN, ROLES.DELIVERY, ROLES.VIEWER] },
  { to: '/deliveries', label: 'Deliveries', icon: 'local_shipping', roles: [ROLES.ADMIN, ROLES.DELIVERY, ROLES.VIEWER] },
  { to: '/stock', label: 'Stock', icon: 'inventory_2', roles: [ROLES.ADMIN, ROLES.DELIVERY, ROLES.VIEWER] },
  { to: '/customers', label: 'Customers', icon: 'groups', roles: [ROLES.ADMIN, ROLES.DELIVERY, ROLES.VIEWER] },
  { to: '/orders', label: 'Orders', icon: 'event_note', roles: [ROLES.ADMIN, ROLES.DELIVERY, ROLES.VIEWER] },
] satisfies Array<{ to: string; label: string; icon: string; roles: Role[] }>

const visibleItems = computed(() => items.filter((item) => !user.value || item.roles.includes(user.value.role)))

function isActive(to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}

const segments = computed(() => route.path.split('/').filter(Boolean))
const isSubRoute = computed(() => segments.value.length >= 2)

const parentPath = computed(() => {
  const segs = segments.value
  if (segs.length === 0) return '/'
  return '/' + segs.slice(0, -1).join('/')
})
</script>

<template>
  <nav class="fixed bottom-0 inset-x-0 mx-auto max-w-[480px] z-40 flex justify-around items-center rounded-t-xl bg-surface-container-high py-2 px-2 shadow-[0_-2px_16px_rgba(0,0,0,0.15)] border-t border-outline-variant/30">
    <template v-if="isSubRoute">
      <NuxtLink
        :to="parentPath"
        class="flex items-center gap-2 w-full justify-center py-2 text-on-surface-variant hover:text-on-surface transition-colors active:scale-95"
      >
        <Icon name="arrow_back" />
        <span class="text-body-base font-medium">Back</span>
      </NuxtLink>
    </template>
    <template v-else>
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
    </template>
  </nav>
</template>
