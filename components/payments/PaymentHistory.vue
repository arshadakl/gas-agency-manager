<script setup lang="ts">
import type { CustomerPaymentWithRelations } from '~/composables/usePayments'

defineProps<{
  payments: CustomerPaymentWithRelations[]
}>()

const { t } = useLocale()
</script>

<template>
  <EmptyState v-if="payments.length === 0" title="No payments yet" />
  <div v-else class="flex flex-col gap-md">
    <div v-for="payment in payments" :key="payment.id" class="bg-surface-container rounded-xl p-4 border border-outline-variant/20">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-data-primary text-on-surface">{{ payment.customerName }}</p>
          <p class="text-data-tertiary text-on-surface-variant mt-0.5">{{ formatDate(payment.paymentDate) }} · {{ payment.paymentMode }}</p>
        </div>
        <span class="text-data-primary text-primary-fixed-dim">{{ formatCurrency(payment.amount) }}</span>
      </div>
      <p v-if="payment.items.length > 0" class="text-data-tertiary text-on-surface-variant mt-2">
        {{ payment.items.map((i) => `${i.product.name} x${i.quantity}`).join(', ') }}
      </p>
      <p class="text-data-tertiary text-on-surface-variant mt-2 pt-2 border-t border-outline-variant/20">{{ t('collected_by') }} {{ payment.createdByName }}</p>
    </div>
  </div>
</template>
