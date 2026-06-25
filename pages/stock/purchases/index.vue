<script setup lang="ts">
import { Button } from '~/components/ui/button'
import type { Purchase } from '~/types/database'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { fetchPurchases, loading } = usePurchases()
const purchases = ref<Purchase[]>([])

onMounted(async () => {
  purchases.value = await fetchPurchases()
})

const totalTrips = computed(() => purchases.value.length)
const totalSpent = computed(() => purchases.value.reduce((sum, p) => sum + p.totalAmount, 0))

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg">
    <div class="flex items-center justify-between">
      <h1 class="text-headline-md text-on-surface">Purchases</h1>
      <Button size="sm" class="rounded-lg" as-child>
        <NuxtLink to="/stock/purchases/new"><Icon name="add" class="text-base mr-1" /> New Purchase</NuxtLink>
      </Button>
    </div>

    <section v-if="purchases.length > 0" class="grid grid-cols-2 gap-sm">
      <div class="bg-surface-container rounded-xl p-md flex flex-col justify-center">
        <span class="text-label-caps text-on-surface-variant mb-xs">PURCHASES</span>
        <span class="text-headline-md text-on-surface">{{ totalTrips }} <span class="text-data-secondary text-on-surface-variant ml-xs">trips</span></span>
      </div>
      <div class="bg-surface-container rounded-xl p-md flex flex-col justify-center">
        <span class="text-label-caps text-on-surface-variant mb-xs">SPENT</span>
        <span class="text-headline-md text-primary-fixed-dim">{{ formatCurrency(totalSpent) }}</span>
      </div>
    </section>

    <div v-if="loading && purchases.length === 0" class="flex justify-center py-12">
      <LoadingSpinner />
    </div>
    <EmptyState v-else-if="purchases.length === 0" title="No purchases yet" description="Record a purchase from your supplier to get started." />
    <div v-else class="flex flex-col gap-md">
      <NuxtLink
        v-for="p in purchases"
        :key="p.id"
        :to="`/stock/purchases/${p.id}`"
        class="bg-surface-container rounded-xl p-md flex flex-col gap-md border border-outline-variant/20 hover:border-outline-variant/40 transition-colors"
      >
        <div class="flex justify-between items-start">
          <div class="flex flex-col">
            <span class="text-data-primary text-on-surface flex items-center gap-sm">
              <Icon name="local_shipping" class="text-[18px] text-on-surface-variant" /> {{ p.supplier }}
            </span>
            <span class="text-data-secondary text-on-surface-variant mt-xs">{{ formatDate(p.purchaseDate) }}<span v-if="p.invoiceNo"> · {{ p.invoiceNo }}</span></span>
          </div>
          <div class="flex flex-col items-end">
            <span class="text-data-primary text-on-surface">{{ formatCurrency(p.totalAmount) }}</span>
            <div
              class="rounded-full px-2 py-0.5 mt-sm flex items-center gap-xs border"
              :class="p.paymentStatus === 'paid' ? 'bg-tertiary-container/20 border-tertiary-container/30' : 'bg-error-container/20 border-error-container/30'"
            >
              <div class="w-1.5 h-1.5 rounded-full" :class="p.paymentStatus === 'paid' ? 'bg-tertiary' : 'bg-error'" />
              <span class="text-label-caps" :class="p.paymentStatus === 'paid' ? 'text-tertiary' : 'text-error'">{{ p.paymentStatus.toUpperCase() }}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center justify-between pt-sm border-t border-surface-variant">
          <div class="flex items-center gap-sm">
            <span class="flex h-6 w-6 items-center justify-center rounded-full bg-surface-variant text-[9px] font-bold text-on-surface-variant">
              {{ initials(p.createdByName) }}
            </span>
            <span class="text-data-tertiary text-on-surface-variant">Added by {{ p.createdByName }}</span>
          </div>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
