<script setup lang="ts">
import type { PurchaseFormData } from '~/composables/usePurchases'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { user } = useUserSession()
if (user.value?.role !== 'admin') await navigateTo('/stock')

const { createPurchase, loading, error } = usePurchases()

async function handleSubmit(data: PurchaseFormData) {
  const created = await createPurchase(data)
  if (created) await navigateTo('/stock/purchases')
}
</script>

<template>
  <div class="px-margin-mobile py-lg pb-8">
    <h1 class="text-headline-md text-on-surface mb-lg">New Purchase</h1>
    <PurchaseForm :loading="loading" :error="error" @submit="handleSubmit" @cancel="navigateTo('/stock/purchases')" />
  </div>
</template>
