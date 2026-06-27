<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { PAYMENT_MODES } from '~/types'
import type { OrderDeliverPayload } from '~/composables/useOrders'

const props = defineProps<{
  open: boolean
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  confirm: [data: OrderDeliverPayload]
  cancel: []
}>()

const deliveryDate = ref(toISODate(new Date()))
const paidNow = ref(false)
const paymentMode = ref<typeof PAYMENT_MODES[number]>('cash')

function handleConfirm() {
  emit('confirm', {
    deliveryDate: deliveryDate.value,
    paymentStatus: paidNow.value ? 'paid' : 'pending',
    paymentMode: paidNow.value ? paymentMode.value : undefined,
  })
}
</script>

<template>
  <div v-if="props.open" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
    <div class="w-full max-w-sm rounded-xl bg-surface-container-high p-5 shadow-lg space-y-md">
      <h2 class="text-data-primary text-on-surface">Mark order as delivered?</h2>

      <div class="space-y-1">
        <label class="text-data-tertiary text-on-surface-variant block mb-1">Delivery Date</label>
        <input
          v-model="deliveryDate"
          type="date"
          class="block w-full px-3 py-2.5 border border-surface-variant rounded-lg bg-surface text-on-surface text-body-base focus:outline-none focus:border-primary"
        >
      </div>

      <div class="space-y-2">
        <label class="text-data-secondary text-on-surface-variant block uppercase tracking-wider">Payment</label>
        <div class="flex gap-sm">
          <button
            type="button"
            class="flex-1 px-3 py-2 rounded-full text-data-secondary border transition-all"
            :class="!paidNow ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant text-on-surface-variant'"
            @click="paidNow = false"
          >
            Pending
          </button>
          <button
            type="button"
            class="flex-1 px-3 py-2 rounded-full text-data-secondary border transition-all"
            :class="paidNow ? 'border-tertiary text-tertiary bg-tertiary/10' : 'border-outline-variant text-on-surface-variant'"
            @click="paidNow = true"
          >
            Paid now
          </button>
        </div>
        <div v-if="paidNow" class="flex gap-sm overflow-x-auto pt-1">
          <button
            v-for="mode in PAYMENT_MODES"
            :key="mode"
            type="button"
            class="shrink-0 px-3 py-1.5 rounded-full text-data-secondary capitalize border transition-all"
            :class="paymentMode === mode ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant text-on-surface-variant'"
            @click="paymentMode = mode"
          >
            {{ mode }}
          </button>
        </div>
      </div>

      <p v-if="props.error" class="text-data-secondary text-error">{{ props.error }}</p>

      <div class="flex gap-3">
        <Button type="button" variant="outline" class="flex-1 rounded-lg" @click="emit('cancel')">Cancel</Button>
        <Button type="button" class="flex-1 rounded-lg" :disabled="props.loading" @click="handleConfirm">
          <LoadingSpinner v-if="props.loading" class="h-4 w-4 mr-2" />
          {{ props.loading ? 'Saving...' : 'Yes, Delivered' }}
        </Button>
      </div>
    </div>
  </div>
</template>
