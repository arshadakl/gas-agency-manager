<script setup lang="ts">
import { Button } from '~/components/ui/button'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { fetchBalances, convert, loading, error } = useAccounts()
const { showToast } = useToast()

const balances = ref({ cash: 0, bank: 0, total: 0 })
const direction = ref<'cash_to_bank' | 'bank_to_cash'>('cash_to_bank')
const amount = ref<number | ''>('')
const notes = ref('')
const showConfirm = ref(false)

onMounted(async () => {
  balances.value = await fetchBalances()
})

const fromType = computed(() => direction.value === 'cash_to_bank' ? 'cash' : 'bank')
const toType = computed(() => direction.value === 'cash_to_bank' ? 'bank' : 'cash')
const fromBalance = computed(() => direction.value === 'cash_to_bank' ? balances.value.cash : balances.value.bank)
const maxAmount = computed(() => fromBalance.value)
const amountNum = computed(() => Number(amount.value) || 0)
const isValid = computed(() => amountNum.value > 0 && amountNum.value <= maxAmount.value + 0.01)

function handleConvert() {
  if (!isValid.value) return
  showConfirm.value = true
}

async function confirmConvert() {
  const result = await convert(fromType.value, amountNum.value, notes.value || undefined)
  showConfirm.value = false
  if (result) {
    showToast(`₹${amountNum.value.toLocaleString()} converted from ${fromType.value} to ${toType.value}`)
    await navigateTo('/accounts')
  }
}

function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg">
    <div>
      <NuxtLink to="/accounts" class="text-data-secondary text-on-surface-variant hover:text-on-surface inline-flex items-center gap-1 mb-2">
        <Icon name="arrow_back" class="text-sm" />
        Accounts
      </NuxtLink>
      <h1 class="text-headline-md text-on-surface">Convert Money</h1>
      <p class="text-data-secondary text-on-surface-variant mt-1">Move between Cash and Bank</p>
    </div>

    <!-- Direction toggle -->
    <div class="bg-surface-container rounded-xl p-1 border border-outline-variant/30 flex">
      <button
        class="flex-1 py-3 rounded-lg text-data-secondary transition-colors flex items-center justify-center gap-2"
        :class="direction === 'cash_to_bank' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant'"
        @click="direction = 'cash_to_bank'"
      >
        <Icon name="payments" class="text-sm" /> Cash → Bank
      </button>
      <button
        class="flex-1 py-3 rounded-lg text-data-secondary transition-colors flex items-center justify-center gap-2"
        :class="direction === 'bank_to_cash' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant'"
        @click="direction = 'bank_to_cash'"
      >
        <Icon name="account_balance" class="text-sm" /> Bank → Cash
      </button>
    </div>

    <!-- Balance preview -->
    <div class="grid grid-cols-2 gap-sm">
      <div class="bg-surface-container rounded-xl p-3 border border-outline-variant/30">
        <span class="text-data-tertiary text-on-surface-variant">{{ fromType === 'cash' ? 'Cash' : 'Bank' }} (From)</span>
        <p class="text-data-primary text-on-surface">{{ formatCurrency(fromBalance) }}</p>
      </div>
      <div class="bg-surface-container rounded-xl p-3 border border-outline-variant/30">
        <span class="text-data-tertiary text-on-surface-variant">{{ toType === 'cash' ? 'Cash' : 'Bank' }} (To)</span>
        <p class="text-data-primary text-on-surface">{{ formatCurrency(toType === 'cash' ? balances.cash : balances.bank) }}</p>
      </div>
    </div>

    <!-- Amount input -->
    <div>
      <label class="text-data-secondary text-on-surface-variant">Amount</label>
      <div class="relative mt-1">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-body-base">₹</span>
        <input
          v-model.number="amount"
          type="number"
          inputmode="numeric"
          min="1"
          :max="maxAmount"
          step="1"
          placeholder="0"
          class="block w-full pl-7 pr-3 py-2.5 border border-outline-variant/50 rounded-lg bg-surface-container-highest text-on-surface text-body-base focus:outline-none focus:border-primary"
        >
      </div>
      <p class="text-data-tertiary text-on-surface-variant mt-1">Max: {{ formatCurrency(maxAmount) }}</p>
    </div>

    <!-- Notes -->
    <div>
      <label class="text-data-secondary text-on-surface-variant">Note (optional)</label>
      <input
        v-model="notes"
        type="text"
        maxlength="500"
        placeholder="e.g. ATM withdrawal, deposit"
        class="block w-full px-3 py-2 border border-outline-variant/50 rounded-lg bg-surface-container-highest text-on-surface text-body-base focus:outline-none focus:border-primary mt-1"
      >
    </div>

    <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

    <!-- Submit button -->
    <Button class="w-full" :disabled="!isValid || loading" @click="handleConvert">
      <LoadingSpinner v-if="loading" class="h-4 w-4 mr-2" />
      Convert {{ formatCurrency(amountNum) }}
    </Button>

    <!-- Confirmation dialog -->
    <div v-if="showConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div class="bg-surface-container rounded-2xl p-6 w-full max-w-sm border border-outline-variant/30">
        <h3 class="text-headline-md text-on-surface mb-2">Confirm Conversion</h3>
        <p class="text-body-base text-on-surface-variant mb-4">
          Convert <strong class="text-on-surface">{{ formatCurrency(amountNum) }}</strong>
          from <strong class="text-on-surface">{{ fromType === 'cash' ? 'Cash' : 'Bank' }}</strong>
          to <strong class="text-on-surface">{{ toType === 'cash' ? 'Cash' : 'Bank' }}</strong>?
        </p>
        <div v-if="notes" class="text-data-secondary text-on-surface-variant mb-4">Note: {{ notes }}</div>
        <div class="flex gap-3">
          <Button variant="outline" class="flex-1" @click="showConfirm = false">Cancel</Button>
          <Button class="flex-1" @click="confirmConvert" :disabled="loading">
            <LoadingSpinner v-if="loading" class="h-4 w-4 mr-2" />
            Confirm
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
