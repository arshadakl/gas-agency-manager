<script setup lang="ts">
import type { AccountTransaction } from '~/types/database'
import type { AccountType } from '~/types'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { user } = useUserSession()
const { fetchBalances, fetchTransactions, loading } = useAccounts()

const balances = ref({ cash: 0, bank: 0, total: 0 })
const transactions = ref<AccountTransaction[]>([])
const filter = ref<'all' | 'cash' | 'bank' | 'conversion'>('all')

const txTypeLabels: Record<string, string> = {
  delivery_collection: 'Delivery',
  payment_received: 'Payment',
  purchase_paid: 'Purchase',
  purchase_clear: 'Purchase Clear',
  expense: 'Expense',
  conversion_in: 'Convert In',
  conversion_out: 'Convert Out',
  adjustment: 'Adjustment',
}

const txTypeIcons: Record<string, string> = {
  delivery_collection: 'local_shipping',
  payment_received: 'payments',
  purchase_paid: 'local_shipping',
  purchase_clear: 'payments',
  expense: 'receipt',
  conversion_in: 'arrow_downward',
  conversion_out: 'arrow_upward',
  adjustment: 'sync_alt',
}

const accountIcons: Record<string, string> = {
  cash: 'payments',
  bank: 'account_balance',
}

const filteredTransactions = computed(() => {
  if (filter.value === 'all') return transactions.value
  if (filter.value === 'conversion') {
    return transactions.value.filter(tx =>
      tx.transactionType === 'conversion_in' || tx.transactionType === 'conversion_out'
    )
  }
  return transactions.value.filter(tx => tx.accountType === filter.value)
})

async function load() {
  const [balData, txData] = await Promise.all([
    fetchBalances(),
    fetchTransactions({ limit: 50 }),
  ])
  balances.value = balData
  transactions.value = txData
}

onMounted(load)

function formatTxDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function balanceTextClass(amount: number) {
  const text = formatCurrency(amount)
  if (text.length > 12) return 'text-headline-md'
  if (text.length > 9) return 'text-xl font-semibold'
  return 'text-display-lg'
}
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg">
    <div>
      <NuxtLink to="/reports" class="text-data-secondary text-on-surface-variant hover:text-on-surface inline-flex items-center gap-1 mb-2">
        <Icon name="arrow_back" class="text-sm" />
        Reports
      </NuxtLink>
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-headline-md text-on-surface">SuperGas Accounts</h1>
          <p class="text-data-secondary text-on-surface-variant mt-1">Cash & bank balances</p>
        </div>
        <NuxtLink to="/accounts/convert" class="flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary-container text-on-primary-container text-data-secondary">
          <Icon name="swap_horiz" class="text-sm" />
          Convert
        </NuxtLink>
      </div>
    </div>

    <!-- Balance cards -->
    <div class="grid grid-cols-2 gap-sm">
      <div class="bg-surface-container rounded-xl p-4 border border-outline-variant/30">
        <div class="flex items-center gap-2 mb-1">
          <Icon name="payments" class="text-sm text-emerald-500" />
          <span class="text-data-secondary text-on-surface-variant">Cash</span>
        </div>
        <p class="text-on-surface mt-1 truncate" :class="balanceTextClass(balances.cash)">{{ formatCurrency(balances.cash) }}</p>
      </div>
      <div class="bg-surface-container rounded-xl p-4 border border-outline-variant/30">
        <div class="flex items-center gap-2 mb-1">
          <Icon name="account_balance" class="text-sm text-blue-500" />
          <span class="text-data-secondary text-on-surface-variant">Bank</span>
        </div>
        <p class="text-on-surface mt-1 truncate" :class="balanceTextClass(balances.bank)">{{ formatCurrency(balances.bank) }}</p>
      </div>
      <div class="bg-surface-container-high rounded-xl p-4 border border-outline-variant/30 col-span-2">
        <div class="flex items-center justify-between">
          <span class="text-data-secondary text-on-surface-variant">Total Balance</span>
        </div>
        <p class="text-primary-fixed-dim mt-1 truncate" :class="balanceTextClass(balances.total)">{{ formatCurrency(balances.total) }}</p>
      </div>
    </div>

    <!-- Transaction filters -->
    <div class="flex gap-1.5 overflow-x-auto no-scrollbar -mx-2 px-2">
      <button
        v-for="opt in [
          { key: 'all', label: 'All' },
          { key: 'cash', label: 'Cash' },
          { key: 'bank', label: 'Bank' },
          { key: 'conversion', label: 'Conversion' },
        ] as const"
        :key="opt.key"
        class="px-3 py-1.5 rounded-full text-data-secondary border whitespace-nowrap transition-colors shrink-0"
        :class="filter === opt.key ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant/30 text-on-surface-variant'"
        @click="filter = opt.key"
      >
        {{ opt.label }}
      </button>
    </div>

    <!-- Transaction history -->
    <section>
      <h3 class="text-label-caps text-on-surface-variant tracking-widest uppercase mb-3">Transactions</h3>

      <div v-if="loading && transactions.length === 0" class="flex justify-center py-8">
        <LoadingSpinner />
      </div>
      <EmptyState v-else-if="filteredTransactions.length === 0" title="No transactions" description="No transactions match this filter." />
      <div v-else class="flex flex-col">
        <div
          v-for="tx in filteredTransactions"
          :key="tx.id"
          class="flex items-center gap-3 py-3 border-b border-surface-container-highest"
        >
          <div class="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            :class="tx.amount >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'">
            <Icon :name="txTypeIcons[tx.transactionType] ?? 'receipt'" class="text-lg" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-data-primary text-on-surface truncate">
              {{ txTypeLabels[tx.transactionType] ?? tx.transactionType }}
              <span v-if="tx.notes" class="text-on-surface-variant">— {{ tx.notes }}</span>
            </p>
            <p class="text-data-tertiary text-on-surface-variant">
              {{ formatTxDate(tx.createdAt) }} · {{ tx.createdByName }}
            </p>
          </div>
          <div class="flex flex-col items-end shrink-0">
            <span class="text-data-primary" :class="tx.amount >= 0 ? 'text-emerald-500' : 'text-red-500'">
              {{ tx.amount >= 0 ? '+' : '' }}{{ formatCurrency(tx.amount) }}
            </span>
            <span class="text-data-tertiary text-on-surface-variant capitalize flex items-center gap-1">
              <Icon :name="accountIcons[tx.accountType] ?? 'payments'" class="text-xs" />
              {{ tx.accountType }}
            </span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
