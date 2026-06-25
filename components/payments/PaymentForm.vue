<script setup lang="ts">
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Button } from '~/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { PAYMENT_MODES } from '~/types'
import type { Customer, NewCustomerPayment } from '~/types/database'

const props = defineProps<{
  customers: Customer[]
  initialCustomerId?: number
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  submit: [data: Omit<NewCustomerPayment, 'createdBy' | 'createdByName'>]
}>()

const form = reactive({
  customerId: props.initialCustomerId,
  amount: 0,
  paymentMode: 'cash' as typeof PAYMENT_MODES[number],
  paymentDate: toISODate(new Date()),
  notes: '',
})
const validationError = ref('')

function handleSubmit() {
  validationError.value = ''
  if (!form.customerId) {
    validationError.value = 'Select a customer first.'
    return
  }
  if (!form.amount || form.amount <= 0) {
    validationError.value = 'Enter an amount.'
    return
  }
  emit('submit', {
    customerId: form.customerId,
    amount: form.amount,
    paymentMode: form.paymentMode,
    paymentDate: form.paymentDate,
    notes: form.notes || undefined,
  })
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="handleSubmit">
    <div class="space-y-1">
      <Label>Customer</Label>
      <Select v-model="form.customerId">
        <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
        <SelectContent>
          <SelectItem v-for="c in props.customers" :key="c.id" :value="c.id">{{ c.name }}</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div class="space-y-1">
      <Label for="amount">Amount</Label>
      <Input id="amount" v-model.number="form.amount" type="number" step="0.01" min="0" required />
    </div>
    <div class="space-y-1">
      <Label>Payment Mode</Label>
      <Select v-model="form.paymentMode">
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem v-for="mode in PAYMENT_MODES" :key="mode" :value="mode">{{ mode }}</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div class="space-y-1">
      <Label for="paymentDate">Payment Date</Label>
      <Input id="paymentDate" v-model="form.paymentDate" type="date" required />
    </div>
    <div class="space-y-1">
      <Label for="notes">Notes</Label>
      <Input id="notes" v-model="form.notes" />
    </div>
    <p v-if="validationError" class="text-sm text-destructive">{{ validationError }}</p>
    <p v-if="props.error" class="text-sm text-destructive">{{ props.error }}</p>
    <Button type="submit" class="w-full" :disabled="props.loading">
      <LoadingSpinner v-if="props.loading" class="h-4 w-4 mr-2" />
      {{ props.loading ? 'Saving...' : 'Record Payment' }}
    </Button>
  </form>
</template>
