<script setup lang="ts">
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Button } from '~/components/ui/button'
import type { Customer, NewCustomer } from '~/types/database'

const props = defineProps<{
  customer?: Customer
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  submit: [data: NewCustomer]
  cancel: []
}>()

const form = reactive({
  name: props.customer?.name ?? '',
  contactPerson: props.customer?.contactPerson ?? '',
  area: props.customer?.area ?? '',
  phone: props.customer?.phone ?? '',
  whatsappNumber: props.customer?.whatsappNumber ?? '',
  address: props.customer?.address ?? '',
})

function handleSubmit() {
  emit('submit', {
    name: form.name,
    contactPerson: form.contactPerson || undefined,
    area: form.area || undefined,
    phone: form.phone,
    whatsappNumber: form.whatsappNumber || undefined,
    address: form.address || undefined,
  })
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="handleSubmit">
    <div class="space-y-1">
      <Label for="name">Name</Label>
      <Input id="name" v-model="form.name" required />
    </div>
    <div class="space-y-1">
      <Label for="contactPerson">Contact Person</Label>
      <Input id="contactPerson" v-model="form.contactPerson" />
    </div>
    <div class="space-y-1">
      <Label for="area">Area</Label>
      <Input id="area" v-model="form.area" />
    </div>
    <div class="space-y-1">
      <Label for="phone">Phone</Label>
      <Input id="phone" v-model="form.phone" type="tel" required />
    </div>
    <div class="space-y-1">
      <Label for="whatsapp">WhatsApp Number (if different)</Label>
      <Input id="whatsapp" v-model="form.whatsappNumber" type="tel" />
    </div>
    <div class="space-y-1">
      <Label for="address">Address</Label>
      <Textarea id="address" v-model="form.address" rows="3" />
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
