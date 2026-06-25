<script setup lang="ts">
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Button } from '~/components/ui/button'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { user, changePassword, loading, error } = useAuth()
const { showToast } = useToast()

const currentPassword = ref('')
const newPassword = ref('')

async function handleSubmit() {
  const ok = await changePassword(currentPassword.value, newPassword.value)
  if (ok) {
    showToast('Password changed successfully')
    currentPassword.value = ''
    newPassword.value = ''
  }
}
</script>

<template>
  <div class="px-4 py-4">
    <h2 class="text-lg font-semibold mb-4">My Account</h2>
    <p class="text-sm text-muted-foreground mb-4">
      {{ user?.fullName }} · @{{ user?.username }} · {{ user?.role }}
    </p>

    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div class="space-y-1">
        <Label for="currentPassword">Current Password</Label>
        <Input id="currentPassword" v-model="currentPassword" type="password" required />
      </div>
      <div class="space-y-1">
        <Label for="newPassword">New Password</Label>
        <Input id="newPassword" v-model="newPassword" type="password" minlength="8" required />
      </div>
      <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
      <Button type="submit" class="w-full" :disabled="loading">
        <LoadingSpinner v-if="loading" class="h-4 w-4 mr-2" />
        {{ loading ? 'Saving...' : 'Change Password' }}
      </Button>
    </form>
  </div>
</template>
