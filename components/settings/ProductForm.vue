<script setup lang="ts">
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Button } from '~/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { CYLINDER_SIZES, PRODUCT_TYPES } from '~/types'
import type { Product, NewProduct } from '~/types/database'

const props = defineProps<{
  product?: Product
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  submit: [data: NewProduct]
  cancel: []
}>()

const form = reactive({
  name: props.product?.name ?? '',
  type: props.product?.type ?? 'cylinder',
  cylinderSize: props.product?.cylinderSize ?? undefined,
  unit: props.product?.unit ?? 'pcs',
})

function handleSubmit() {
  emit('submit', {
    name: form.name,
    type: form.type,
    cylinderSize: form.type === 'cylinder' ? form.cylinderSize : undefined,
    unit: form.unit,
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
      <Select v-model="form.type">
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem v-for="t in PRODUCT_TYPES" :key="t" :value="t">{{ t }}</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div v-if="form.type === 'cylinder'" class="space-y-1">
      <Label>Cylinder Size (kg)</Label>
      <Select v-model="form.cylinderSize">
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem v-for="size in CYLINDER_SIZES" :key="size" :value="size">{{ size }} kg</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div class="space-y-1">
      <Label for="unit">Unit</Label>
      <Input id="unit" v-model="form.unit" required />
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
