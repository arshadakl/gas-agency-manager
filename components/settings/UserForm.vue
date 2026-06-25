<script setup lang="ts">
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Button } from '~/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { ROLES } from '~/types'

const props = defineProps<{
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  submit: [data: { username: string; fullName: string; role: string; password: string }]
  cancel: []
}>()

const form = reactive({
  username: '',
  fullName: '',
  role: ROLES.DELIVERY,
  password: '',
})

function handleSubmit() {
  emit('submit', { ...form })
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="handleSubmit">
    <div class="space-y-1">
      <Label for="username">Username</Label>
      <Input id="username" v-model="form.username" required />
    </div>
    <div class="space-y-1">
      <Label for="fullName">Full Name</Label>
      <Input id="fullName" v-model="form.fullName" required />
    </div>
    <div class="space-y-1">
      <Label>Role</Label>
      <Select v-model="form.role">
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem :value="ROLES.ADMIN">admin</SelectItem>
          <SelectItem :value="ROLES.DELIVERY">delivery</SelectItem>
          <SelectItem :value="ROLES.VIEWER">viewer</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div class="space-y-1">
      <Label for="password">Password</Label>
      <Input id="password" v-model="form.password" type="password" minlength="8" required />
    </div>
    <p v-if="props.error" class="text-sm text-destructive">{{ props.error }}</p>
    <div class="flex gap-3">
      <Button type="button" variant="outline" class="flex-1" @click="emit('cancel')">Cancel</Button>
      <Button type="submit" class="flex-1" :disabled="props.loading">
        <LoadingSpinner v-if="props.loading" class="h-4 w-4 mr-2" />
        {{ props.loading ? 'Saving...' : 'Create User' }}
      </Button>
    </div>
  </form>
</template>
