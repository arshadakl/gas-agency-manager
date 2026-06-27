<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { PAYMENT_MODES } from '~/types'
import type { Customer, NewCustomerPayment } from '~/types/database'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { user } = useUserSession()
const { fetchPayments, recordPayment, loading, error } = usePayments()
const { fetchCustomers } = useCustomers()

const route = useRoute()
const payments = ref<Awaited<ReturnType<typeof fetchPayments>>>([])
const customers = ref<Customer[]>([])
const preselectedCustomerId = route.query.customerId ? Number(route.query.customerId) : undefined
const showForm = ref(Boolean(preselectedCustomerId))

const filterFrom = ref('')
const filterTo = ref('')
const filterMode = ref<typeof PAYMENT_MODES[number] | ''>('')

async function load() {
  const [paymentRows, customerRows] = await Promise.all([
    fetchPayments({
      from: filterFrom.value || undefined,
      to: filterTo.value || undefined,
      paymentMode: filterMode.value || undefined,
    }),
    fetchCustomers(),
  ])
  payments.value = paymentRows
  customers.value = customerRows
}

watch([filterFrom, filterTo, filterMode], load)
onMounted(load)

async function handleSubmit(data: Omit<NewCustomerPayment, 'createdBy' | 'createdByName'>) {
  const created = await recordPayment(data)
  if (created) {
    showForm.value = false
    await load()
  }
}
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg pb-40">
    <div class="flex items-center justify-between">
      <h1 class="text-headline-md text-on-surface">All Payments</h1>
      <Button v-if="user?.role === 'admin' || user?.role === 'delivery'" size="icon" class="rounded-full" @click="showForm = true">
        <Icon name="add" />
      </Button>
    </div>

    <div v-if="showForm" class="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
      <PaymentForm :customers="customers" :initial-customer-id="preselectedCustomerId" :loading="loading" :error="error" @submit="handleSubmit" />
    </div>

    <div class="flex gap-sm flex-wrap items-center">
      <input v-model="filterFrom" type="date" class="rounded-xl border border-outline-variant/40 bg-surface-container-highest px-3 py-2 text-body-base text-on-surface focus:outline-none focus:border-primary-container transition-colors" >
      <input v-model="filterTo" type="date" class="rounded-xl border border-outline-variant/40 bg-surface-container-highest px-3 py-2 text-body-base text-on-surface focus:outline-none focus:border-primary-container transition-colors" >
      <select v-model="filterMode" class="rounded-xl border border-outline-variant/40 bg-surface-container-highest px-3 py-2 text-body-base text-on-surface capitalize focus:outline-none focus:border-primary-container transition-colors appearance-none pr-8">
        <option value="">All modes</option>
        <option v-for="mode in PAYMENT_MODES" :key="mode" :value="mode">{{ mode }}</option>
      </select>
    </div>

    <div v-if="loading && payments.length === 0" class="flex justify-center py-12">
      <LoadingSpinner />
    </div>
    <PaymentHistory v-else :payments="payments" />
  </div>
</template>
