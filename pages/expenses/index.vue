t<script setup lang="ts">
import { Button } from '~/components/ui/button'
import type { ExpenseTag, PaymentSource } from '~/types'
import { EXPENSE_TAGS } from '~/types'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { user } = useUserSession()
const { fetchExpenses, deleteExpense } = useExpenses()

const expenses = ref<Array<{ id: number; publicId: string | null; expenseDate: string; amount: number; tag: ExpenseTag; paymentSource: PaymentSource; notes: string | null; createdBy: number; createdByName: string; createdAt: string }>>([])
const totalExpenses = ref(0)
const byTag = ref<Record<string, number>>({})
const bySource = ref<Record<string, number>>({})
const tagFilter = ref<ExpenseTag | ''>('')
const datePreset = ref<string>('this_month')
const loadingList = ref(true)

type DatePreset = 'today' | 'this_week' | 'this_month' | 'last_3_months' | 'last_6_months' | 'this_year' | 'all'

const datePresets: Array<{ key: DatePreset; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'this_week', label: 'This Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_3_months', label: '3 Months' },
  { key: 'last_6_months', label: '6 Months' },
  { key: 'this_year', label: 'This Year' },
  { key: 'all', label: 'All Time' },
]

function getDateRange(preset: string): { from?: string; to?: string } {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const startOfDay = (d: Date) => { d.setHours(0, 0, 0, 0); return d }
  const startOfWeek = (d: Date) => { const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); d.setDate(diff); return startOfDay(d) }
  const startOfMonth = (d: Date) => { d.setDate(1); return startOfDay(d) }
  const startOfYear = (d: Date) => { d.setMonth(0, 1); return startOfDay(d) }
  const subMonths = (d: Date, n: number) => { d.setMonth(d.getMonth() - n); return d }

  const now = new Date(today)
  switch (preset) {
    case 'today': return { from: fmt(now), to: fmt(now) }
    case 'this_week': return { from: fmt(startOfWeek(new Date(now))), to: fmt(now) }
    case 'this_month': return { from: fmt(startOfMonth(new Date(now))), to: fmt(now) }
    case 'last_3_months': return { from: fmt(subMonths(new Date(now), 3)), to: fmt(now) }
    case 'last_6_months': return { from: fmt(subMonths(new Date(now), 6)), to: fmt(now) }
    case 'this_year': return { from: fmt(startOfYear(new Date(now))), to: fmt(now) }
    default: return {}
  }
}

async function load() {
  loadingList.value = true
  const params: { tag?: string; from?: string; to?: string } = {}
  if (tagFilter.value) params.tag = tagFilter.value
  const range = getDateRange(datePreset.value)
  if (range.from) params.from = range.from
  if (range.to) params.to = range.to
  const result = await fetchExpenses(Object.keys(params).length ? params : undefined)
  expenses.value = result.data
  totalExpenses.value = result.total
  byTag.value = result.byTag
  bySource.value = result.bySource
  loadingList.value = false
}

watch([tagFilter, datePreset], () => load())
onMounted(load)

async function handleDelete(publicId: string) {
  if (!confirm('Delete this expense?')) return
  const success = await deleteExpense(publicId)
  if (success) await load()
}

function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

const tagLabels: Record<ExpenseTag, string> = {
  fuel: 'Fuel',
  maintenance: 'Vehicle Maintenance',
  fine: 'Fine',
  other: 'Other',
}

const tagIcons: Record<ExpenseTag, string> = {
  fuel: 'local_gas_station',
  maintenance: 'build',
  fine: 'gavel',
  other: 'more_horiz',
}

const tagColors: Record<ExpenseTag, string> = {
  fuel: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  maintenance: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  fine: 'bg-red-500/10 text-red-500 border-red-500/30',
  other: 'bg-surface-container-highest text-on-surface-variant border-outline-variant/30',
}

const sourceLabels: Record<PaymentSource, string> = { cash: 'Cash', bank: 'Bank' }
const sourceIcons: Record<PaymentSource, string> = { cash: 'payments', bank: 'account_balance' }
const sourceColors: Record<PaymentSource, string> = {
  cash: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  bank: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
}
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg">
    <div class="flex items-end justify-between gap-md">
      <div>
        <h1 class="text-headline-md text-on-surface">Expenses</h1>
        <p class="text-data-secondary text-on-surface-variant mt-1">Track fuel, maintenance, and other costs.</p>
      </div>
      <NuxtLink v-if="user?.role === 'admin' || user?.role === 'delivery'" to="/expenses/new" class="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
        <Icon name="add" />
      </NuxtLink>
    </div>

    <!-- Date filter presets -->
    <div class="flex gap-1.5 overflow-x-auto no-scrollbar -mx-2 px-2">
      <button
        v-for="preset in datePresets"
        :key="preset.key"
        class="px-3 py-1.5 rounded-full text-data-secondary border whitespace-nowrap transition-colors shrink-0"
        :class="datePreset === preset.key ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant/30 text-on-surface-variant'"
        @click="datePreset = preset.key"
      >
        {{ preset.label }}
      </button>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 gap-sm">
      <div class="bg-surface-container rounded-xl p-4 border border-outline-variant/30 col-span-2">
        <p class="text-data-secondary text-on-surface-variant uppercase tracking-wider">Total Expenses</p>
        <p class="text-display-lg text-on-surface mt-1">{{ formatCurrency(totalExpenses) }}</p>
      </div>
      <div class="bg-surface-container rounded-xl p-3 border border-outline-variant/30">
        <div class="flex items-center gap-2 mb-1">
          <Icon name="payments" class="text-sm text-emerald-500" />
          <span class="text-data-tertiary text-on-surface-variant">Cash</span>
        </div>
        <p class="text-data-primary text-on-surface">{{ formatCurrency(bySource.cash ?? 0) }}</p>
      </div>
      <div class="bg-surface-container rounded-xl p-3 border border-outline-variant/30">
        <div class="flex items-center gap-2 mb-1">
          <Icon name="account_balance" class="text-sm text-blue-500" />
          <span class="text-data-tertiary text-on-surface-variant">Bank</span>
        </div>
        <p class="text-data-primary text-on-surface">{{ formatCurrency(bySource.bank ?? 0) }}</p>
      </div>
      <div
        v-for="tag in EXPENSE_TAGS"
        :key="tag"
        class="bg-surface-container rounded-xl p-3 border border-outline-variant/30"
      >
        <div class="flex items-center gap-2 mb-1">
          <Icon :name="tagIcons[tag]" class="text-sm" :class="tag === 'fuel' ? 'text-amber-500' : tag === 'maintenance' ? 'text-blue-500' : tag === 'fine' ? 'text-red-500' : 'text-on-surface-variant'" />
          <span class="text-data-tertiary text-on-surface-variant">{{ tagLabels[tag] }}</span>
        </div>
        <p class="text-data-primary text-on-surface">{{ formatCurrency(byTag[tag] ?? 0) }}</p>
      </div>
    </div>

    <!-- Tag filter -->
    <div class="flex flex-wrap gap-2">
      <button
        class="px-3 py-1.5 rounded-full text-data-secondary border transition-colors"
        :class="tagFilter === '' ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant/30 text-on-surface-variant'"
        @click="tagFilter = ''"
      >
        All
      </button>
      <button
        v-for="tag in EXPENSE_TAGS"
        :key="tag"
        class="px-3 py-1.5 rounded-full text-data-secondary border transition-colors"
        :class="tagFilter === tag ? tagColors[tag] : 'border-outline-variant/30 text-on-surface-variant'"
        @click="tagFilter = tag"
      >
        {{ tagLabels[tag] }}
      </button>
    </div>

    <!-- Expense list -->
    <div v-if="loadingList" class="flex justify-center py-12">
      <LoadingSpinner />
    </div>
    <EmptyState v-else-if="expenses.length === 0" title="No expenses found" />
    <div v-else class="flex flex-col gap-sm">
      <div
        v-for="expense in expenses"
        :key="expense.id"
        class="bg-surface-container rounded-xl p-4 border border-outline-variant/30 flex items-center gap-3"
      >
        <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0" :class="tagColors[expense.tag]">
          <Icon :name="tagIcons[expense.tag]" class="text-lg" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-data-primary text-on-surface">{{ formatCurrency(expense.amount) }}</span>
            <span class="text-data-tertiary text-on-surface-variant">· {{ tagLabels[expense.tag] }}</span>
          </div>
          <p class="text-data-tertiary text-on-surface-variant mt-0.5">
            {{ formatShortDate(expense.expenseDate) }}
            <span class="inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded-full border text-[10px]"
              :class="sourceColors[expense.paymentSource]">
              <Icon :name="sourceIcons[expense.paymentSource]" class="text-[10px]" />
              {{ sourceLabels[expense.paymentSource] }}
            </span>
            <span v-if="expense.notes"> · {{ expense.notes }}</span>
          </p>
        </div>
        <div v-if="user?.role === 'admin'" class="flex gap-1 shrink-0">
          <NuxtLink :to="`/expenses/new?id=${expense.publicId}`" class="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest">
            <Icon name="edit" class="text-sm" />
          </NuxtLink>
          <button class="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-error-container/20 hover:text-error" @click="handleDelete(expense.publicId!)">
            <Icon name="delete" class="text-sm" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
