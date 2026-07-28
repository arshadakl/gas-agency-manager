<script setup lang="ts">
import { Button } from '~/components/ui/button'
import type { ExpenseTag } from '~/types'
import { EXPENSE_TAGS, PAYMENT_SOURCES } from '~/types'
import type { PaymentSource } from '~/composables/useExpenses'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const route = useRoute()
const { getExpense, createExpense, updateExpense, loading, error } = useExpenses()

const editId = computed(() => route.query.id as string | undefined)
const isEdit = computed(() => Boolean(editId.value))
const pageTitle = computed(() => isEdit.value ? 'Edit Expense' : 'New Expense')

const form = reactive({
  expenseDate: new Date().toISOString().split('T')[0],
  amount: '' as number | '',
  tag: 'fuel' as ExpenseTag,
  paymentSource: 'cash' as PaymentSource,
  notes: '',
})
const formError = ref<string | null>(null)

onMounted(async () => {
  if (editId.value) {
    const expense = await getExpense(editId.value)
    if (expense) {
      form.expenseDate = expense.expenseDate
      form.amount = expense.amount
      form.tag = expense.tag
      form.paymentSource = expense.paymentSource
      form.notes = expense.notes ?? ''
    } else {
      await navigateTo('/expenses')
    }
  }
})

const tagLabels: Record<ExpenseTag, string> = {
  fuel: 'Fuel',
  maintenance: 'Vehicle Maintenance',
  free_accessory: 'Free Accessory',
  other: 'Other',
}

const tagColors: Record<ExpenseTag, string> = {
  fuel: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  maintenance: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  free_accessory: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  other: 'bg-surface-container-highest text-on-surface-variant border-outline-variant/30',
}

const sourceLabels: Record<PaymentSource, string> = { cash: 'Cash', bank: 'Bank' }
const sourceIcons: Record<PaymentSource, string> = { cash: 'payments', bank: 'account_balance' }
const sourceColors: Record<PaymentSource, string> = {
  cash: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  bank: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
}

async function handleSubmit() {
  formError.value = null
  if (!form.amount || form.amount <= 0) {
    formError.value = 'Enter a valid amount'
    return
  }
  const data = {
    expenseDate: form.expenseDate as string,
    amount: Number(form.amount),
    tag: form.tag,
    paymentSource: form.paymentSource,
    notes: form.tag === 'other' && form.notes ? form.notes : undefined,
  }

  if (isEdit.value && editId.value) {
    const updated = await updateExpense(editId.value, data)
    if (updated) {
      await navigateTo('/expenses')
    } else {
      formError.value = error.value
    }
  } else {
    const created = await createExpense(data)
    if (created) {
      await navigateTo('/expenses')
    } else {
      formError.value = error.value
    }
  }
}
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg pb-40">
    <div>
      <NuxtLink to="/expenses" class="text-data-secondary text-on-surface-variant hover:text-on-surface inline-flex items-center gap-1 mb-2">
        <Icon name="arrow_back" class="text-sm" />
        Expenses
      </NuxtLink>
      <h1 class="text-headline-md text-on-surface">{{ pageTitle }}</h1>
    </div>

    <form class="space-y-5" @submit.prevent="handleSubmit">
      <div>
        <label class="text-data-secondary text-on-surface-variant">Date</label>
        <input v-model="form.expenseDate" type="date" class="block w-full px-0 py-2 border border-outline-variant/50 rounded-lg bg-surface-container-highest text-on-surface text-body-base focus:outline-none focus:border-primary">
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

      <div>
        <label class="text-data-secondary text-on-surface-variant">Paid From</label>
        <div class="flex gap-2 mt-1">
          <button
            v-for="source in PAYMENT_SOURCES"
            :key="source"
            type="button"
            class="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-data-secondary border transition-colors"
            :class="form.paymentSource === source ? sourceColors[source] : 'border-outline-variant/30 text-on-surface-variant'"
            @click="form.paymentSource = source"
          >
            <Icon :name="sourceIcons[source]" class="text-sm" />
            {{ sourceLabels[source] }}
          </button>
        </div>
      </div>

      <div v-if="form.tag === 'other'">
        <label class="text-data-secondary text-on-surface-variant">Notes</label>
        <input v-model="form.notes" type="text" maxlength="500" placeholder="What was this expense for?" class="block w-full px-3 py-2 border border-outline-variant/50 rounded-lg bg-surface-container-highest text-on-surface text-body-base focus:outline-none focus:border-primary">
      </div>

      <p v-if="formError" class="text-sm text-destructive">{{ formError }}</p>
    </form>

    <!-- Sticky bottom bar -->
    <div class="fixed bottom-0 inset-x-0 z-50 bg-surface-container-high border-t border-outline-variant/30 px-margin-mobile py-3">
      <div class="flex gap-3">
        <Button variant="outline" class="flex-1" @click="navigateTo('/expenses')">Cancel</Button>
        <Button class="flex-1" :disabled="loading" @click="handleSubmit">
          <LoadingSpinner v-if="loading" class="h-4 w-4 mr-2" />
          {{ isEdit ? 'Update' : 'Save' }}
        </Button>
      </div>
    </div>
  </div>
</template>
