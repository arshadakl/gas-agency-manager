<script setup lang="ts">
import { Badge } from '~/components/ui/badge'
import type { DeliveryWithRelations } from '~/types/database'

defineProps<{
  delivery: DeliveryWithRelations
}>()

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}
</script>

<template>
  <div class="bg-surface-container-high rounded-xl p-5 border border-outline-variant/10 flex flex-col gap-sm">
    <div class="flex justify-between items-start mb-xs">
      <!-- Level 1: business name -->
      <h2 class="text-data-primary text-on-surface line-clamp-1">{{ delivery.customer.name }}</h2>
      <div class="text-right shrink-0 ml-2">
        <p class="text-data-primary text-on-surface">{{ formatCurrency(delivery.totalAmount) }}</p>
        <Badge
          class="mt-0.5"
          :class="delivery.paymentStatus === 'paid' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-error-container/40 text-error border-error/30'"
        >
          {{ delivery.paymentStatus === 'paid' ? 'Clear' : 'Pending' }}
        </Badge>
      </div>
    </div>
    <!-- Level 2: contact person -->
    <div v-if="delivery.customer.contactPerson" class="flex items-center gap-xs text-on-surface-variant">
      <Icon name="person" class="text-sm" />
      <span class="text-data-secondary">{{ delivery.customer.contactPerson }}</span>
    </div>
    <p class="text-data-tertiary text-on-surface-variant">{{ formatDate(delivery.deliveryDate) }}</p>

    <!-- Level 3: delivered by, meta chip -->
    <div class="mt-auto pt-sm">
      <div class="inline-flex items-center gap-xs bg-secondary-container/20 text-secondary-fixed-dim px-3 py-1.5 rounded-full">
        <span class="flex h-4 w-4 items-center justify-center rounded-full bg-secondary-container text-[8px] font-bold text-on-secondary-container">
          {{ initials(delivery.createdByName) }}
        </span>
        <span class="text-data-tertiary">Delivered by {{ delivery.createdByName }}</span>
      </div>
    </div>
  </div>
</template>
