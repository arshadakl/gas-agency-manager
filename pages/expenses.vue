<script setup lang="ts">
import { Button } from '~/components/ui/button'
import type { ExpenseTag } from '~/types'
import { EXPENSE_TAGS } from '~/types'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { user } = useUserSession()
const { fetchExpenses, createExpense, updateExpense, deleteExpense, loading, error } = useExpenses()

const expenses = ref<Array<{ id: number; expenseDate: string; amount: number; tag: ExpenseTag; notes: string | null; createdBy: number; createdByName: string; createdAt: string }>>([])
const totalExpenses = ref(0)
const byTag = ref<Record<string, number>>({})
const tagFilter = ref<ExpenseTag | ''>('')
const loadingList = ref(true)

// Form state
const showForm = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({
  expenseDate: new Date().toISOString().split('T')[0],
  amount: '' as number | '',
  tag: 'fuel' as ExpenseTag,
  notes: '',
})
const formError = ref<string | null>(null)

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

async function load() {
  loadingList.value = true
  const params: { tag?: string } = {}
  if (tagFilter.value) params.tag = tagFilter.value
  const result = await fetchExpenses(Object.keys(params).length ? params : undefined)
  expenses.value = result.data
  totalExpenses.value = result.total
  byTag.value = result.byTag
  loadingList.value = false
}

watch(tagFilter, () => load())
onMounted(load)

function openCreate() {
  editingId.value = null
  form.expenseDate = new Date().toISOString().split('T')[0]
  form.amount = ''
  form.tag = 'fuel'
  form.notes = ''
  formError.value = null
  showForm.value = true
}

function openEdit(expense: typeof expenses.value[0]) {
  editingId.value = expense.id
  form.expenseDate = expense.expenseDate
  form.amount = expense.amount
  form.tag = expense.tag
  form.notes = expense.notes ?? ''
  formError.value = null
  showForm.value = true
}

async function handleSubmit() {
  formError.value = null
  if (!form.amount || form.amount <= 0) {
    formError.value = 'Enter a valid amount'
    return
  }
  const data = {
    expenseDate: form.expenseDate,
    amount: Number(form.amount),
    tag: form.tag,
    notes: form.tag === 'other' && form.notes ? form.notes : undefined,
  }

  if (editingId.value) {
    const updated = await updateExpense(editingId.value, data)
    if (updated) {
      showForm.value = false
      await load()
    } else {
      formError.value = error.value
    }
  } else {
    const created = await createExpense(data)
    if (created) {
      showForm.value = false
      await load()
    } else {
      formError.value = error.value
    }
  }
}

async function handleDelete(id: number) {
  if (!confirm('Delete this expense?')) return
  const success = await deleteExpense(id)
  if (success) await load()
}

function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg pb-40">
    <div class="flex items-end justify-between gap-md">
      <div>
        <h1 class="text-headline-md text-on-surface">Expenses</h1>
        <p class="text-data-secondary text-on-surface-variant mt-1">Track fuel, maintenance, and other costs.</p>
      </div>
      <Button v-if="user?.role === 'admin' || user?.role === 'delivery'" size="icon" class="rounded-full shrink-0" @click="openCreate">
        <Icon name="add" />
      </Button>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 gap-sm">
      <div class="bg-surface-container rounded-xl p-4 border border-outline-variant/30 col-span-2">
        <p class="text-data-secondary text-on-surface-variant uppercase tracking-wider">Total Expenses</p>
        <p class="text-display-lg text-on-surface mt-1">{{ formatCurrency(totalExpenses) }}</p>
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

    <!-- Add/Edit form -->
    <div v-if="showForm" class="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
      <h3 class="text-data-primary text-on-surface mb-3">{{ editingId ? 'Edit Expense' : 'New Expense' }}</h3>
      <form class="space-y-3" @submit.prevent="handleSubmit">
        <div>
          <label class="text-data-secondary text-on-surface-variant">Date</label>
          <input v-model="form.expenseDate" type="date" class="block w-full px-3 py-2 border border-outline-variant/50 rounded-lg bg-surface-container-highest text-on-surface text-body-base focus:outline-none focus:border-primary">
        </div>
        <div>
          <label class="text-data-secondary text-on-surface-variant">Amount (₹)</label>
          <input v-model.number="form.amount" type="number" inputmode="numeric" min="1" step="1" placeholder="e.g. 500" class="block w-full px-3 py-2 border border-outline-variant/50 rounded-lg bg-surface-container-highest text-on-surface text-body-base focus:outline-none focus:border-primary">
        </div>
        <div>
          <label class="text-data-secondary text-on-surface-variant">Category</label>
          <div class="flex flex-wrap gap-2 mt-1">
            <button
              v-for="tag in EXPENSE_TAGS"
              :key="tag"
              type="button"
              class="px-3 py-1.5 rounded-full text-data-secondary border transition-colors"
              :class="form.tag === tag ? tagColors[tag] : 'border-outline-variant/30 text-on-surface-variant'"
              @click="form.tag = tag"
            >
              {{ tagLabels[tag] }}
            </button>
          </div>
        </div>
        <div v-if="form.tag === 'other'">
          <label class="text-data-secondary text-on-surface-variant">Notes</label>
          <input v-model="form.notes" type="text" maxlength="500" placeholder="What was this expense for?" class="block w-full px-3 py-2 border border-outline-variant/50 rounded-lg bg-surface-container-highest text-on-surface text-body-base focus:outline-none focus:border-primary">
        </div>
        <p v-if="formError" class="text-sm text-destructive">{{ formError }}</p>
        <div class="flex gap-2">
          <Button type="submit" class="flex-1" :disabled="loading">
            <LoadingSpinner v-if="loading" class="h-4 w-4 mr-2" />
            {{ editingId ? 'Update' : 'Save' }}
          </Button>
          <Button type="button" variant="outline" class="flex-1" @click="showForm = false">Cancel</Button>
        </div>
      </form>
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
            <span v-if="expense.notes"> · {{ expense.notes }}</span>
          </p>
        </div>
        <div v-if="user?.role === 'admin'" class="flex gap-1 shrink-0">
          <button class="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest" @click="openEdit(expense)">
            <Icon name="edit" class="text-sm" />
          </button>
          <button class="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-error-container/20 hover:text-error" @click="handleDelete(expense.id)">
            <Icon name="delete" class="text-sm" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
