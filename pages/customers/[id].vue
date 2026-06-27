<script setup lang="ts">
import { Button } from '~/components/ui/button'
import type { Customer, Delivery, CustomerPayment, NewCustomer } from '~/types/database'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const route = useRoute()
const id = Number(route.params.id)

const { fetchLedger, updateCustomer, loading, error } = useCustomers()
const { user } = useUserSession()

const customer = ref<Customer | null>(null)
const totalBilled = ref(0)
const totalPaid = ref(0)
const balance = ref(0)
const deliveries = ref<Delivery[]>([])
const payments = ref<CustomerPayment[]>([])
const editing = ref(false)

async function load() {
  const ledger = await fetchLedger(id)
  if (!ledger) return
  customer.value = ledger.customer
  totalBilled.value = ledger.totalBilled
  totalPaid.value = ledger.totalPaid
  balance.value = ledger.balance
  deliveries.value = ledger.deliveries
  payments.value = ledger.payments
}

onMounted(load)

async function handleUpdate(data: NewCustomer) {
  const updated = await updateCustomer(id, data)
  if (updated) {
    editing.value = false
    await load()
  }
}
</script>

<template>
  <div class="px-margin-mobile py-lg">
    <div v-if="error && !customer" class="flex flex-col items-center py-12 gap-3">
      <Icon name="error" class="text-error text-4xl" />
      <p class="text-data-secondary text-error">{{ error }}</p>
    </div>
    <div v-else-if="!customer" class="flex justify-center py-12">
      <LoadingSpinner />
    </div>
    <template v-else>
      <div class="flex items-start justify-between mb-lg gap-md">
        <div>
          <h1 class="text-headline-md text-on-surface">{{ customer.name }}</h1>
          <p v-if="customer.contactPerson" class="text-data-secondary text-on-surface-variant mt-1">{{ customer.contactPerson }}</p>
          <p class="text-data-secondary text-on-surface-variant mt-1">{{ formatPhone(customer.phone) }}<span v-if="customer.area"> · {{ customer.area }}</span></p>
          <p v-if="customer.address" class="text-data-secondary text-on-surface-variant mt-1">{{ customer.address }}</p>
        </div>
        <div class="flex gap-2 shrink-0">
          <Button v-if="user?.role === 'admin' || user?.role === 'delivery'" size="icon" variant="outline" class="rounded-full" as-child>
            <NuxtLink :to="`/payments?customerId=${id}`"><Icon name="payments" class="text-lg" /></NuxtLink>
          </Button>
          <Button v-if="user?.role === 'admin' || user?.role === 'delivery'" size="icon" variant="outline" class="rounded-full" @click="editing = !editing">
            <Icon name="edit" class="text-lg" />
          </Button>
        </div>
      </div>

      <div v-if="editing" class="mb-lg rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
        <CustomerForm :customer="customer" :loading="loading" :error="error" @submit="handleUpdate" @cancel="editing = false" />
      </div>

      <CustomerLedger
        :total-billed="totalBilled"
        :total-paid="totalPaid"
        :balance="balance"
        :deliveries="deliveries"
        :payments="payments"
        @paid="load()"
      />
    </template>
  </div>
</template>
