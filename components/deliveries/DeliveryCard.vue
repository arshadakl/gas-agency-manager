<script setup lang="ts">
import { Badge } from '~/components/ui/badge'
import { PAYMENT_MODES } from '~/types'
import type { DeliveryWithRelations } from '~/types/database'
import type { PaymentMode } from '~/types'

defineProps<{
  delivery: DeliveryWithRelations
}>()

const emit = defineEmits<{
  paid: []
}>()

const { user } = useUserSession()
const { t } = useLocale()
const { markAsPaid, loading } = useDeliveries()

const showPaymentPicker = ref(false)
const selectedMode = ref<PaymentMode>('cash')

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

function canEdit() {
  return user.value?.role === 'admin' || user.value?.role === 'delivery'
}

async function handleMarkPaid(delivery: DeliveryWithRelations) {
  const ok = await markAsPaid(delivery.id, selectedMode.value)
  if (ok) {
    showPaymentPicker.value = false
    emit('paid')
  }
}
</script>

<template>
  <div class="bg-surface-container-high rounded-xl p-5 border border-outline-variant/10 flex flex-col gap-sm">
    <div class="flex justify-between items-start mb-xs">
      <!-- Level 1: business name -->
      <NuxtLink
        :to="`/deliveries/${delivery.id}`"
        class="flex-1 hover:opacity-80 transition-opacity"
      >
        <h2 class="text-data-primary text-on-surface line-clamp-1">{{ delivery.customer.name }}</h2>
      </NuxtLink>
      <div class="text-right shrink-0 ml-2 flex items-start gap-2">
        <div>
          <p class="text-data-primary text-on-surface">{{ formatCurrency(delivery.totalAmount) }}</p>
          <Badge
            class="mt-0.5"
            :class="delivery.paymentStatus === 'paid' ? 'bg-success/15 text-success border-success/30' : 'bg-error-container/40 text-error border-error/30'"
          >
            {{ delivery.paymentStatus === 'paid' ? 'Clear' : 'Pay Later' }}
          </Badge>
        </div>
        <div v-if="canEdit()" class="flex gap-1 pt-1">
          <NuxtLink
            :to="`/deliveries/${delivery.id}`"
            class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-variant transition-colors"
            title="View details"
          >
            <Icon name="info" class="text-sm" />
          </NuxtLink>
        </div>
      </div>
    </div>
    <!-- Level 2: contact person -->
    <div v-if="delivery.customer.contactPerson" class="flex items-center gap-xs text-on-surface-variant">
      <Icon name="person" class="text-sm" />
      <span class="text-data-secondary">{{ delivery.customer.contactPerson }}</span>
    </div>
    <p class="text-data-tertiary text-on-surface-variant">{{ formatDate(delivery.deliveryDate) }}</p>

    <!-- Level 3: delivered by, meta chip -->
    <div class="mt-auto pt-sm flex items-center justify-between gap-2">
      <div class="inline-flex items-center gap-xs bg-secondary-container/20 text-secondary-fixed-dim px-3 py-1.5 rounded-full">
        <span class="flex h-4 w-4 items-center justify-center rounded-full bg-secondary-container text-[8px] font-bold text-on-secondary-container">
          {{ initials(delivery.createdByName) }}
        </span>
        <span class="text-data-tertiary">{{ t('delivered_by') }} {{ delivery.createdByName }}</span>
      </div>
      <!-- Mark Paid quick action -->
      <button
        v-if="canEdit() && delivery.paymentStatus === 'pending'"
        class="flex items-center gap-1 rounded-full bg-success/15 border border-success/30 text-success px-3 py-1 text-data-tertiary hover:bg-success/25 transition-colors active:scale-95"
        @click.prevent="showPaymentPicker = !showPaymentPicker"
      >
        <Icon name="payments" class="text-sm" />
        Mark Paid
      </button>
    </div>

    <!-- Inline payment mode picker -->
    <div v-if="showPaymentPicker && delivery.paymentStatus === 'pending'" class="border-t border-outline-variant/20 pt-sm flex flex-col gap-sm">
      <p class="text-data-tertiary text-on-surface-variant">How was payment collected?</p>
      <div class="flex gap-1.5 flex-wrap">
        <button
          v-for="mode in PAYMENT_MODES"
          :key="mode"
          class="px-3 py-1.5 rounded-full text-data-tertiary capitalize border transition-all"
          :class="selectedMode === mode
            ? 'bg-primary-container/20 border-primary-container text-primary-fixed-dim font-medium'
            : 'border-outline-variant/40 text-on-surface-variant hover:bg-surface-variant'"
          @click="selectedMode = mode"
        >
          {{ mode }}
        </button>
      </div>
      <div class="flex gap-2">
        <button
          class="flex-1 rounded-xl bg-success/20 border border-success/40 text-success py-2 text-data-secondary font-medium hover:bg-success/30 transition-colors disabled:opacity-50"
          :disabled="loading"
          @click="handleMarkPaid(delivery)"
        >
          <LoadingSpinner v-if="loading" class="h-3 w-3 inline mr-1" />
          Confirm Paid
        </button>
        <button
          class="px-4 rounded-xl border border-outline-variant/30 text-on-surface-variant text-data-secondary hover:bg-surface-variant transition-colors"
          @click="showPaymentPicker = false"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>
