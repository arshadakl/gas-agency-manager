<script setup lang="ts">
import type { CustomerWithBalance } from '~/types/database'

const props = defineProps<{
  customer: CustomerWithBalance
}>()

const { t } = useLocale()
const isClear = computed(() => props.customer.balance <= 0)
</script>

<template>
  <NuxtLink
    :to="`/customers/${customer.id}`"
    class="bg-surface-container-low border rounded-xl p-[20px] flex flex-col gap-md hover:bg-surface-container transition-colors group relative overflow-hidden"
    :class="isClear ? 'border-outline-variant/20' : 'border-error-container/40'"
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
      <div
        class="px-sm py-xs rounded-full text-label-caps flex items-center gap-xs border shrink-0"
        :class="isClear ? 'bg-success/10 text-success border-success/20' : 'bg-error-container text-on-error-container border-error-container/50'"
      >
        <div class="w-1.5 h-1.5 rounded-full" :class="isClear ? 'bg-success' : 'bg-error'" />
        {{ isClear ? t('balance_clear') : t('balance_pending') }}
      </div>
    </div>
    <div class="pt-sm border-t border-outline-variant/20 flex justify-between items-end">
      <div>
        <p class="text-data-tertiary text-on-surface-variant">{{ t('current_balance') }}</p>
        <p class="text-data-primary mt-1" :class="isClear ? 'text-on-surface' : 'text-error font-bold'">{{ formatCurrency(customer.balance) }}</p>
      </div>
      <span class="w-8 h-8 rounded-full border border-outline-variant/50 flex items-center justify-center text-on-surface-variant group-hover:text-primary group-hover:border-primary transition-all">
        <Icon name="arrow_forward" class="text-[18px]" />
      </span>
    </div>
  </NuxtLink>
</template>
