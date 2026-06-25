<script setup lang="ts">
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Button } from '~/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import type { Customer, NewPrice } from '~/types/database'

const props = defineProps<{
  productId: number
  customers: Customer[]
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  submit: [data: NewPrice]
  cancel: []
}>()

const DEFAULT_OPTION = 'default'

const form = reactive({
  customerId: DEFAULT_OPTION as string | number,
  price: 0,
  effectiveFrom: toISODate(new Date()),
})

function handleSubmit() {
  emit('submit', {
    productId: props.productId,
    customerId: form.customerId === DEFAULT_OPTION ? undefined : Number(form.customerId),
    price: form.price,
    effectiveFrom: form.effectiveFrom,
  })
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="handleSubmit">
    <div class="space-y-1">
      <Label>Customer</Label>
      <Select v-model="form.customerId">
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem :value="DEFAULT_OPTION">Default (all customers)</SelectItem>
          <SelectItem v-for="c in props.customers" :key="c.id" :value="String(c.id)">{{ c.name }}</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div class="space-y-1">
      <Label for="price">Price</Label>
      <Input id="price" v-model.number="form.price" type="number" step="0.01" min="0" required />
    </div>
    <div class="space-y-1">
      <Label for="effectiveFrom">Effective From</Label>
      <Input id="effectiveFrom" v-model="form.effectiveFrom" type="date" required />
    </div>
    <p v-if="props.error" class="text-sm text-destructive">{{ props.error }}</p>
    <div class="flex gap-3">
      <Button type="button" variant="outline" class="flex-1" @click="emit('cancel')">Cancel</Button>
      <Button type="submit" class="flex-1" :disabled="props.loading">
        <LoadingSpinner v-if="props.loading" class="h-4 w-4 mr-2" />
        {{ props.loading ? 'Saving...' : 'Save' }}
      </Button>
    </div>
  </form>
</template>
