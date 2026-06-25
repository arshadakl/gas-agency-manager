<script setup lang="ts">
import type { Delivery, CustomerPayment } from '~/types/database'

defineProps<{
  totalBilled: number
  totalPaid: number
  balance: number
  deliveries: Delivery[]
  payments: CustomerPayment[]
}>()
</script>

<template>
  <div class="flex flex-col gap-lg">
    <div class="bg-surface-container-high rounded-xl border border-outline-variant/30 grid grid-cols-3 gap-2 p-4 text-center">
      <div>
        <p class="text-data-tertiary text-on-surface-variant">Billed</p>
        <p class="text-data-primary text-on-surface mt-1">{{ formatCurrency(totalBilled) }}</p>
      </div>
      <div>
        <p class="text-data-tertiary text-on-surface-variant">Paid</p>
        <p class="text-data-primary text-on-surface mt-1">{{ formatCurrency(totalPaid) }}</p>
      </div>
      <div>
        <p class="text-data-tertiary text-on-surface-variant">Balance</p>
        <p class="text-data-primary mt-1" :class="balance > 0 ? 'text-error' : 'text-primary-fixed-dim'">{{ formatCurrency(balance) }}</p>
      </div>
    </div>

    <div>
      <h2 class="text-data-primary text-on-surface mb-sm">Recent Deliveries</h2>
      <EmptyState v-if="deliveries.length === 0" title="No deliveries yet" />
      <div v-else class="rounded-xl border border-outline-variant/30 bg-surface-container-low divide-y divide-outline-variant/20">
        <div v-for="delivery in deliveries" :key="delivery.id" class="px-4 py-3">
          <div class="flex justify-between text-body-base text-on-surface">
            <span>{{ formatDate(delivery.deliveryDate) }}</span>
            <span class="text-data-primary">{{ formatCurrency(delivery.totalAmount) }}</span>
          </div>
          <p class="text-data-tertiary text-on-surface-variant mt-0.5">Delivered by {{ delivery.createdByName }}</p>
        </div>
      </div>
    </div>

    <div>
      <h2 class="text-data-primary text-on-surface mb-sm">Recent Payments</h2>
      <EmptyState v-if="payments.length === 0" title="No payments yet" />
      <div v-else class="rounded-xl border border-outline-variant/30 bg-surface-container-low divide-y divide-outline-variant/20">
        <div v-for="payment in payments" :key="payment.id" class="flex justify-between px-4 py-3 text-body-base text-on-surface">
          <span>{{ formatDate(payment.paymentDate) }} · {{ payment.paymentMode }}</span>
          <span class="text-data-primary">{{ formatCurrency(payment.amount) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
