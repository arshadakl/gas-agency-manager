<script setup lang="ts">
import type { OrderWithRelations } from '~/types/database'

defineProps<{
  order: OrderWithRelations
}>()
</script>

<template>
  <NuxtLink
    :to="`/orders/${order.id}`"
    class="bg-surface-container-high rounded-xl p-5 border border-outline-variant/10 flex flex-col gap-sm"
  >
    <div class="flex justify-between items-start mb-xs">
      <h2 class="text-data-primary text-on-surface line-clamp-1">{{ order.customer.name }}</h2>
      <Icon name="chevron_right" class="text-on-surface-variant" />
    </div>
    <div v-if="order.customer.contactPerson" class="flex items-center gap-xs text-on-surface-variant">
      <Icon name="person" class="text-sm" />
      <span class="text-data-secondary">{{ order.customer.contactPerson }}</span>
    </div>
    <p class="text-data-tertiary text-on-surface-variant">{{ formatDate(order.orderDate) }} · {{ order.items.length }} item(s)</p>
    <p class="text-data-tertiary text-on-surface-variant">Booked by {{ order.createdByName }}</p>
  </NuxtLink>
</template>
