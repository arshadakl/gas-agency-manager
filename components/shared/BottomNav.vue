<script setup lang="ts">
import { ROLES, type Role } from '~/types'

const route = useRoute()
const { user } = useUserSession()
const { t } = useLocale()

const NAV_DEFS = [
  { to: '/', key: 'home' as const, icon: 'home', roles: [ROLES.ADMIN, ROLES.DELIVERY, ROLES.VIEWER] },
  { to: '/deliveries', key: 'deliveries' as const, icon: 'local_shipping', roles: [ROLES.ADMIN, ROLES.DELIVERY, ROLES.VIEWER] },
  { to: '/stock', key: 'stock' as const, icon: 'inventory_2', roles: [ROLES.ADMIN, ROLES.DELIVERY, ROLES.VIEWER] },
  { to: '/customers', key: 'customers' as const, icon: 'groups', roles: [ROLES.ADMIN, ROLES.DELIVERY, ROLES.VIEWER] },
  { to: '/reports', key: 'reports' as const, icon: 'analytics', roles: [ROLES.ADMIN, ROLES.DELIVERY, ROLES.VIEWER] },
] satisfies Array<{ to: string; key: import('~/utils/i18n').TranslationKey; icon: string; roles: Role[] }>

const visibleDefs = computed(() => NAV_DEFS.filter((item) => !user.value || item.roles.includes(user.value.role)))

function isActive(to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}

</script>

<template>
  <nav class="fixed bottom-0 inset-x-0 mx-auto max-w-[480px] z-40 flex justify-around items-center rounded-t-xl bg-surface-container-high py-2 px-2 shadow-[0_-2px_16px_rgba(0,0,0,0.15)] border-t border-outline-variant/30">
    <NuxtLink
      v-for="item in visibleDefs"
      :key="item.to"
      :to="item.to"
      :class="[
        'flex flex-col items-center justify-center px-4 py-1 transition-all active:scale-90',
        isActive(item.to) ? 'bg-primary-container text-on-primary-container rounded-full' : 'text-on-surface-variant hover:text-primary-fixed-dim',
      ]"
    >
      <Icon :name="item.icon" :filled="isActive(item.to)" />
      <span class="font-bold text-label-caps mt-1">{{ t(item.key) }}</span>
    </NuxtLink>
  </nav>
</template>
