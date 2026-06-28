<script setup lang="ts">
import { Button } from '~/components/ui/button'
import type { Customer, Delivery, CustomerPayment, NewCustomer } from '~/types/database'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const route = useRoute()
const id = route.params.id as string

const { fetchLedger, updateCustomer, setOpeningBalance, loading, error } = useCustomers()
const { user } = useUserSession()

const customer = ref<Customer | null>(null)
const openingBalance = ref(0)
const totalBilled = ref(0)
const totalPaid = ref(0)
const balance = ref(0)
const deliveries = ref<Delivery[]>([])
const payments = ref<CustomerPayment[]>([])
const editing = ref(false)

// Opening balance edit state
const editingBalance = ref(false)
const balanceInput = ref(0)
const balanceError = ref<string | null>(null)

async function load() {
  const ledger = await fetchLedger(id)
  if (!ledger) return
  customer.value = ledger.customer
  openingBalance.value = ledger.openingBalance
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

function startBalanceEdit() {
  balanceInput.value = openingBalance.value
  balanceError.value = null
  editingBalance.value = true
}

async function handleSaveBalance() {
  balanceError.value = null
  const updated = await setOpeningBalance(id, balanceInput.value)
  if (updated) {
    editingBalance.value = false
    await load()
  } else {
    balanceError.value = error.value
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
            <NuxtLink :to="`/payments?customerId=${customer?.id}`"><Icon name="payments" class="text-lg" /></NuxtLink>
          </Button>
          <Button v-if="user?.role === 'admin' || user?.role === 'delivery'" size="icon" variant="outline" class="rounded-full" @click="editing = !editing">
            <Icon name="edit" class="text-lg" />
          </Button>
        </div>
      </div>

      <div v-if="editing" class="mb-lg rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
        <CustomerForm :customer="customer" :loading="loading" :error="error" @submit="handleUpdate" @cancel="editing = false" />
      </div>

      <!-- Opening Balance -->
      <div v-if="user?.role === 'admin' || user?.role === 'delivery'" class="mb-lg rounded-xl border border-outline-variant/30 bg-surface-container p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-data-secondary text-on-surface-variant uppercase tracking-wider">Opening Balance</p>
            <p class="text-data-primary text-on-surface mt-0.5">{{ formatCurrency(openingBalance) }}</p>
            <p class="text-data-tertiary text-on-surface-variant mt-0.5">Pre-app debt added to total balance</p>
          </div>
          <button
            class="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors"
            @click="startBalanceEdit"
          >
            <Icon name="edit" class="text-sm" />
          </button>
        </div>

        <div v-if="editingBalance" class="mt-3 border-t border-outline-variant/20 pt-3 flex flex-col gap-2">
          <label class="text-data-secondary text-on-surface-variant">Amount (₹)</label>
          <input
            v-model.number="balanceInput"
            type="number"
            inputmode="numeric"
            min="0"
            step="1"
            class="block w-full px-3 py-2 border border-outline-variant/50 rounded-lg bg-surface-container-highest text-on-surface text-body-base focus:outline-none focus:border-primary"
          >
          <p v-if="balanceError" class="text-data-tertiary text-error">{{ balanceError }}</p>
          <div class="flex gap-2">
            <Button size="sm" :disabled="loading" @click="handleSaveBalance">
              <LoadingSpinner v-if="loading" class="h-3 w-3 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" @click="editingBalance = false">Cancel</Button>
          </div>
        </div>
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
