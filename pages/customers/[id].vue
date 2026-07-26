<script setup lang="ts">
import { Button } from '~/components/ui/button'
import type { Customer, DeliveryWithRelations, CustomerPayment, NewCustomer } from '~/types/database'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const route = useRoute()
const id = route.params.id as string

const { fetchLedger, updateCustomer, setOpeningBalance, setPromise, archiveCustomer, loading, error } = useCustomers()
const { user } = useUserSession()

const customer = ref<Customer | null>(null)
const openingBalance = ref(0)
const totalBilled = ref(0)
const totalPaid = ref(0)
const balance = ref(0)
const deliveries = ref<DeliveryWithRelations[]>([])
const payments = ref<CustomerPayment[]>([])
const editing = ref(false)

// Opening balance edit state
const editingBalance = ref(false)
const balanceInput = ref(0)
const balanceError = ref<string | null>(null)

// Payment promise edit state
const editingPromise = ref(false)
const promiseDateInput = ref('')
const promiseNoteInput = ref('')
const promiseError = ref<string | null>(null)

const promiseOverdue = computed(() =>
  !!customer.value?.promisedPayDate && customer.value.promisedPayDate < toISODate(new Date()),
)

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

function startPromiseEdit() {
  promiseDateInput.value = customer.value?.promisedPayDate ?? ''
  promiseNoteInput.value = customer.value?.promisedPayNote ?? ''
  promiseError.value = null
  editingPromise.value = true
}

async function handleSavePromise() {
  promiseError.value = null
  if (!promiseDateInput.value) {
    promiseError.value = 'Pick a date'
    return
  }
  const updated = await setPromise(id, promiseDateInput.value, promiseNoteInput.value || null)
  if (updated) {
    editingPromise.value = false
    await load()
  } else {
    promiseError.value = error.value
  }
}

async function handleClearPromise() {
  const updated = await setPromise(id, null)
  if (updated) {
    editingPromise.value = false
    await load()
  }
}

const showArchiveConfirm = ref(false)

async function handleArchive() {
  const action = await archiveCustomer(id)
  if (action) {
    showArchiveConfirm.value = false
    await navigateTo('/customers')
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
          <Button v-if="user?.role === 'admin'" size="icon" variant="outline" class="rounded-full border-error/40 text-error hover:bg-error-container/20" @click="showArchiveConfirm = true">
            <Icon name="delete" class="text-lg" />
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

      <!-- Payment Promise -->
      <!-- Viewer sees an existing promise read-only; admin/delivery also see the card when there's a balance to chase. -->
      <div
        v-if="customer.promisedPayDate || ((user?.role === 'admin' || user?.role === 'delivery') && balance > 0)"
        class="mb-lg rounded-xl border p-4"
        :class="promiseOverdue ? 'border-error/40 bg-error-container/10' : 'border-outline-variant/30 bg-surface-container'"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-data-secondary text-on-surface-variant uppercase tracking-wider">Payment Promise</p>
            <template v-if="customer.promisedPayDate">
              <p class="text-data-primary mt-0.5" :class="promiseOverdue ? 'text-error' : 'text-on-surface'">
                {{ promiseOverdue ? 'Overdue — promised' : 'Will pay by' }} {{ formatDate(customer.promisedPayDate) }}
              </p>
              <p v-if="customer.promisedPayNote" class="text-data-tertiary text-on-surface-variant mt-0.5">{{ customer.promisedPayNote }}</p>
            </template>
            <p v-else class="text-data-tertiary text-on-surface-variant mt-0.5">No promise set — tap edit to note when they'll pay</p>
          </div>
          <button
            v-if="user?.role === 'admin' || user?.role === 'delivery'"
            class="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors"
            @click="startPromiseEdit"
          >
            <Icon name="edit" class="text-sm" />
          </button>
        </div>

        <div v-if="editingPromise" class="mt-3 border-t border-outline-variant/20 pt-3 flex flex-col gap-2">
          <label class="text-data-secondary text-on-surface-variant">Promised Date</label>
          <input
            v-model="promiseDateInput"
            type="date"
            class="block w-full px-3 py-2 border border-outline-variant/50 rounded-lg bg-surface-container-highest text-on-surface text-body-base focus:outline-none focus:border-primary"
          >
          <label class="text-data-secondary text-on-surface-variant">Note (optional)</label>
          <input
            v-model="promiseNoteInput"
            type="text"
            maxlength="300"
            placeholder="e.g. Will settle after weekend sales"
            class="block w-full px-3 py-2 border border-outline-variant/50 rounded-lg bg-surface-container-highest text-on-surface text-body-base focus:outline-none focus:border-primary"
          >
          <p v-if="promiseError" class="text-data-tertiary text-error">{{ promiseError }}</p>
          <div class="flex gap-2">
            <Button size="sm" :disabled="loading" @click="handleSavePromise">
              <LoadingSpinner v-if="loading" class="h-3 w-3 mr-1" />
              Save
            </Button>
            <Button v-if="customer.promisedPayDate" size="sm" variant="outline" class="border-error text-error" :disabled="loading" @click="handleClearPromise">Clear</Button>
            <Button size="sm" variant="outline" @click="editingPromise = false">Cancel</Button>
          </div>
        </div>
      </div>

      <!-- Connection Deposit -->
      <div v-if="customer.connectionDeposit" class="mb-lg rounded-xl border border-outline-variant/30 bg-surface-container p-4">
        <p class="text-data-secondary text-on-surface-variant uppercase tracking-wider">Connection Deposit Held</p>
        <p class="text-data-primary text-on-surface mt-0.5">{{ formatCurrency(customer.connectionDeposit) }}</p>
        <p class="text-data-tertiary text-on-surface-variant mt-0.5">{{ customer.depositNote || 'Refundable — not part of outstanding balance' }}</p>
      </div>

      <CustomerLedger
        :total-billed="totalBilled"
        :total-paid="totalPaid"
        :balance="balance"
        :deliveries="deliveries"
        :payments="payments"
        @paid="load()"
      />

      <!-- Archive Confirmation Dialog -->
      <ConfirmDialog
        :open="showArchiveConfirm"
        title="Remove Customer?"
        :message="`This will hide ${customer.name} from the customer list. Their delivery history, payments, and balance records will NOT be deleted — they are preserved for your financial records.`"
        confirm-text="Remove"
        cancel-text="Cancel"
        :destructive="true"
        :loading="loading"
        @confirm="handleArchive"
        @cancel="showArchiveConfirm = false"
      />
    </template>
  </div>
</template>
