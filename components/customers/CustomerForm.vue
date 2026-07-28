<script setup lang="ts">
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Button } from '~/components/ui/button'
import { CUSTOMER_TYPES } from '~/types'
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

const INDIAN_PHONE = /^[6-9]\d{9}$/

const form = reactive({
  name: props.customer?.name ?? '',
  contactPerson: props.customer?.contactPerson ?? '',
  area: props.customer?.area ?? '',
  phone: props.customer?.phone ?? '',
  whatsappNumber: props.customer?.whatsappNumber ?? '',
  address: props.customer?.address ?? '',
  type: (props.customer?.type ?? 'restaurant') as 'restaurant' | 'home',
  connectionDeposit: props.customer?.connectionDeposit ?? ('' as number | ''),
  depositNote: props.customer?.depositNote ?? '',
})

const phoneTouched = ref(false)
const whatsappTouched = ref(false)

const phoneError = computed(() => {
  if (!phoneTouched.value && !form.phone) return ''
  if (!form.phone) return 'Phone number required'
  if (!INDIAN_PHONE.test(form.phone.replace(/\s/g, ''))) return 'Must be a 10-digit Indian mobile number (starts with 6–9)'
  return ''
})

const whatsappError = computed(() => {
  if (!whatsappTouched.value || !form.whatsappNumber) return ''
  if (!INDIAN_PHONE.test(form.whatsappNumber.replace(/\s/g, ''))) return 'Must be a 10-digit Indian mobile number (starts with 6–9)'
  return ''
})

const formValid = computed(() => !phoneError.value && !whatsappError.value && form.name.length >= 2)

function handleSubmit() {
  phoneTouched.value = true
  if (!formValid.value) return
  emit('submit', {
    name: form.name,
    contactPerson: form.contactPerson || undefined,
    area: form.area || undefined,
    phone: form.phone.replace(/\s/g, ''),
    whatsappNumber: form.whatsappNumber ? form.whatsappNumber.replace(/\s/g, '') : undefined,
    address: form.address || undefined,
    type: form.type,
    connectionDeposit: form.connectionDeposit === '' ? null : Number(form.connectionDeposit),
    depositNote: form.depositNote || null,
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
      <Label>Type</Label>
      <div class="flex gap-2">
        <button
          v-for="t in CUSTOMER_TYPES"
          :key="t"
          type="button"
          class="flex-1 py-2.5 rounded-xl border text-data-secondary capitalize transition-colors"
          :class="form.type === t
            ? 'border-primary bg-primary/10 text-primary font-medium'
            : 'border-outline-variant/30 text-on-surface-variant'"
          @click="form.type = t"
        >
          {{ t }}
        </button>
      </div>
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
      <Input
        id="phone"
        v-model="form.phone"
        type="tel"
        inputmode="numeric"
        maxlength="10"
        placeholder="e.g. 9876543210"
        required
        :class="phoneTouched && phoneError ? 'border-destructive focus-visible:ring-destructive' : ''"
        @blur="phoneTouched = true"
        @input="phoneTouched = true"
      />
      <p v-if="phoneTouched && phoneError" class="text-xs text-destructive mt-1">{{ phoneError }}</p>
    </div>
    <div class="space-y-1">
      <Label for="whatsapp">WhatsApp Number <span class="text-muted-foreground">(if different)</span></Label>
      <Input
        id="whatsapp"
        v-model="form.whatsappNumber"
        type="tel"
        inputmode="numeric"
        maxlength="10"
        placeholder="e.g. 9876543210"
        :class="whatsappTouched && whatsappError ? 'border-destructive focus-visible:ring-destructive' : ''"
        @blur="whatsappTouched = true"
        @input="whatsappTouched = !!form.whatsappNumber"
      />
      <p v-if="whatsappTouched && whatsappError" class="text-xs text-destructive mt-1">{{ whatsappError }}</p>
    </div>
    <div class="space-y-1">
      <Label for="address">Address</Label>
      <Textarea id="address" v-model="form.address" rows="3" />
    </div>
    <div class="space-y-1">
      <Label for="deposit">Connection Deposit <span class="text-muted-foreground">(optional, refundable)</span></Label>
      <Input id="deposit" v-model.number="form.connectionDeposit" type="number" inputmode="numeric" min="0" step="1" placeholder="e.g. 2000" />
      <p class="text-xs text-muted-foreground">Security deposit held for a new connection — kept separate from outstanding balance.</p>
    </div>
    <div v-if="form.connectionDeposit !== '' && form.connectionDeposit > 0" class="space-y-1">
      <Label for="depositNote">Deposit Note</Label>
      <Input id="depositNote" v-model="form.depositNote" maxlength="300" placeholder="e.g. 2 × 17kg new connection, June 2026" />
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
