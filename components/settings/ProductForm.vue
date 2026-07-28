<script setup lang="ts">
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Button } from '~/components/ui/button'
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
  type: props.product?.type ?? ('cylinder' as 'cylinder' | 'accessory'),
  cylinderSize: props.product?.cylinderSize ?? undefined as number | undefined,
})

function handleSubmit() {
  emit('submit', {
    name: form.name,
    type: form.type,
    cylinderSize: form.type === 'cylinder' ? form.cylinderSize : undefined,
    unit: 'pcs',
  })
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="handleSubmit">
    <div class="space-y-1">
      <Label for="name">Product Name</Label>
      <Input id="name" v-model="form.name" placeholder="e.g. 17kg Cylinder, Regulator" required />
    </div>

    <div class="space-y-2">
      <Label>Product Type</Label>
      <div class="flex gap-2">
        <button
          type="button"
          class="flex-1 rounded-xl border py-3 text-body-base font-medium transition-colors"
          :class="form.type === 'cylinder'
            ? 'border-primary-container bg-primary-container/20 text-primary-container'
            : 'border-outline-variant bg-surface-container-highest text-on-surface-variant hover:border-outline'"
          @click="form.type = 'cylinder'; form.cylinderSize = undefined"
        >
          <Icon name="local_shipping" class="text-lg mr-1.5 align-text-bottom" />
          Cylinder
        </button>
        <button
          type="button"
          class="flex-1 rounded-xl border py-3 text-body-base font-medium transition-colors"
          :class="form.type === 'accessory'
            ? 'border-primary-container bg-primary-container/20 text-primary-container'
            : 'border-outline-variant bg-surface-container-highest text-on-surface-variant hover:border-outline'"
          @click="form.type = 'accessory'; form.cylinderSize = undefined"
        >
          <Icon name="build" class="text-lg mr-1.5 align-text-bottom" />
          Accessories
        </button>
      </div>
    </div>

    <div v-if="form.type === 'cylinder'" class="space-y-1">
      <Label for="cylinderSize">Cylinder Size (kg)</Label>
      <Input id="cylinderSize" v-model.number="form.cylinderSize" type="number" min="1" step="1" placeholder="e.g. 5, 10, 25" required />
    </div>

    <p v-if="props.error" class="text-sm text-destructive">{{ props.error }}</p>
    <div class="flex gap-3">
      <Button type="button" variant="outline" class="flex-1" @click="emit('cancel')">Cancel</Button>
      <Button
        type="submit"
        class="flex-1"
        :disabled="props.loading || !form.name.trim() || (form.type === 'cylinder' && !form.cylinderSize)"
      >
        <LoadingSpinner v-if="props.loading" class="h-4 w-4 mr-2" />
        {{ props.loading ? 'Saving...' : 'Add Product' }}
      </Button>
    </div>
  </form>
</template>
