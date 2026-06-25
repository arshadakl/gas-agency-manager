<script setup lang="ts">
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Button } from '~/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { CYLINDER_SIZES, type CylinderSize } from '~/types'
import type { StockAdjustmentInput } from '~/composables/useInventory'

const props = defineProps<{
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  submit: [data: StockAdjustmentInput]
  cancel: []
}>()

const form = reactive({
  sizeKg: CYLINDER_SIZES[0] as CylinderSize,
  fullChange: 0,
  emptyChange: 0,
  notes: '',
})

function handleSubmit() {
  emit('submit', { ...form, notes: form.notes || undefined })
}
</script>

<template>
  <form class="space-y-3 rounded-xl border border-outline-variant/30 bg-surface-container-low p-4" @submit.prevent="handleSubmit">
    <p class="text-data-primary text-on-surface">Change Stock</p>
    <div class="space-y-1">
      <Label>Cylinder Size</Label>
      <Select v-model="form.sizeKg">
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem v-for="size in CYLINDER_SIZES" :key="size" :value="size">{{ size }}kg</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <div class="space-y-1">
        <Label for="fullChange">Full Cylinders (+ add, - remove)</Label>
        <Input id="fullChange" v-model.number="form.fullChange" type="number" />
      </div>
      <div class="space-y-1">
        <Label for="emptyChange">Empty Cylinders (+ add, - remove)</Label>
        <Input id="emptyChange" v-model.number="form.emptyChange" type="number" />
      </div>
    </div>
    <div class="space-y-1">
      <Label for="notes">Reason</Label>
      <Input id="notes" v-model="form.notes" placeholder="e.g. damaged cylinder write-off" />
    </div>
    <p v-if="props.error" class="text-data-secondary text-error">{{ props.error }}</p>
    <div class="flex gap-3">
      <Button type="button" variant="outline" class="flex-1 rounded-lg" @click="emit('cancel')">Cancel</Button>
      <Button type="submit" class="flex-1 rounded-lg" :disabled="props.loading">
        <LoadingSpinner v-if="props.loading" class="h-4 w-4 mr-2" />
        {{ props.loading ? 'Saving...' : 'Apply' }}
      </Button>
    </div>
  </form>
</template>
