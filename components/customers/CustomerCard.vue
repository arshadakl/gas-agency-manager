<script setup lang="ts">
import type { CustomerWithBalance } from '~/types/database'
import { getOutstandingLevel } from '~/utils/outstanding'

const props = defineProps<{
  customer: CustomerWithBalance
}>()

const { t } = useLocale()
const level = computed(() => getOutstandingLevel(props.customer.pendingDeliveryCount))

const styles = {
  clear: {
    card: 'border-outline-variant/20',
    badge: 'bg-success/10 text-success border-success/20',
    dot: 'bg-success',
    amount: 'text-on-surface',
  },
  warning: {
    card: 'border-amber-500/40',
    badge: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    dot: 'bg-amber-500',
    amount: 'text-amber-500 font-bold',
  },
  high: {
    card: 'border-red-400/40',
    badge: 'bg-red-400/10 text-red-400 border-red-400/30',
    dot: 'bg-red-400',
    amount: 'text-red-400 font-bold',
  },
  critical: {
    card: 'border-error-container/40',
    badge: 'bg-error-container text-on-error-container border-error-container/50',
    dot: 'bg-error',
    amount: 'text-error font-bold',
  },
} as const

const style = computed(() => styles[level.value])
const badgeLabel = computed(() =>
  level.value === 'clear' ? t('balance_clear') : `${props.customer.pendingDeliveryCount} ${t('pending_label')}`,
)

const promiseOverdue = computed(() =>
  !!props.customer.promisedPayDate && props.customer.promisedPayDate < toISODate(new Date()),
)
</script>

<template>
  <NuxtLink
    :to="`/customers/${customer.publicId}`"
    class="bg-surface-container-low border rounded-xl p-[20px] flex flex-col gap-md hover:bg-surface-container transition-colors group relative overflow-hidden"
    :class="style.card"
  >
    <div class="flex justify-between items-start">
      <div>
        <h3 class="text-headline-md text-lg leading-tight text-on-surface group-hover:text-primary transition-colors">{{ customer.name }}</h3>
        <p v-if="customer.contactPerson" class="text-data-secondary text-on-surface-variant flex items-center gap-xs mt-xs">
          <Icon name="person" class="text-[14px]" /> {{ customer.contactPerson }}
        </p>
        <p class="text-data-secondary text-on-surface-variant flex items-center gap-xs mt-1">
          <Icon name="call" class="text-[14px]" /> {{ formatPhone(customer.phone) }}
        </p>
      </div>
      <div class="px-sm py-xs rounded-full text-label-caps flex items-center gap-xs border shrink-0" :class="style.badge">
        <div class="w-1.5 h-1.5 rounded-full" :class="style.dot" />
        {{ badgeLabel }}
      </div>
    </div>
    <div
      v-if="customer.promisedPayDate"
      class="flex items-center gap-xs px-sm py-xs rounded-lg text-data-tertiary border w-fit"
      :class="promiseOverdue ? 'bg-error-container/20 text-error border-error/30' : 'bg-tertiary-container/10 text-tertiary border-tertiary-container/30'"
    >
      <Icon name="event" class="text-[14px]" />
      {{ promiseOverdue ? 'Promise overdue' : 'Will pay' }} · {{ formatDate(customer.promisedPayDate) }}
    </div>
    <div class="pt-sm border-t border-outline-variant/20 flex justify-between items-end">
      <div>
        <p class="text-data-tertiary text-on-surface-variant">{{ t('current_balance') }}</p>
        <p class="text-data-primary mt-1" :class="style.amount">{{ formatCurrency(customer.balance) }}</p>
      </div>
      <span class="w-8 h-8 rounded-full border border-outline-variant/50 flex items-center justify-center text-on-surface-variant group-hover:text-primary group-hover:border-primary transition-all">
        <Icon name="arrow_forward" class="text-[18px]" />
      </span>
    </div>
  </NuxtLink>
</template>
