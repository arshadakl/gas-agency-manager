<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { fetchTodayPayments, loading } = usePayments()
const payments = ref<Awaited<ReturnType<typeof fetchTodayPayments>>>([])

onMounted(async () => {
  payments.value = await fetchTodayPayments()
})

const total = computed(() => payments.value.reduce((sum, p) => sum + p.amount, 0))
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg">
    <h1 class="text-headline-md text-on-surface">Today's Collections</h1>
    <KpiCard hero label="Total Collected Today" :value="formatCurrency(total)" />

    <div v-if="loading && payments.length === 0" class="flex justify-center py-12">
      <LoadingSpinner />
    </div>
    <EmptyState v-else-if="payments.length === 0" title="No payments collected today" />
    <PaymentHistory v-else :payments="payments" />
  </div>
</template>
