<script setup lang="ts">
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Button } from '~/components/ui/button'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { user, changePassword, logout, loading, error } = useAuth()
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

async function handleLogout() {
  await logout()
}
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg pb-40">
    <div>
      <h2 class="text-data-primary text-on-surface mb-2">My Account</h2>
      <p class="text-data-secondary text-on-surface-variant">
        {{ user?.fullName }} · @{{ user?.username }} · {{ user?.role }}
      </p>
    </div>

    <div class="bg-surface-container rounded-xl p-5 border border-surface-container-highest">
      <h3 class="text-data-primary text-on-surface mb-4">Change Password</h3>
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div>
          <label class="block text-data-secondary text-on-surface-variant mb-2">Current Password</label>
          <input v-model="currentPassword" type="password" required class="w-full px-3 py-2 border border-surface-variant rounded-lg bg-surface text-on-surface text-body-base focus:outline-none focus:border-primary" />
        </div>
        <div>
          <label class="block text-data-secondary text-on-surface-variant mb-2">New Password</label>
          <input v-model="newPassword" type="password" minlength="8" required class="w-full px-3 py-2 border border-surface-variant rounded-lg bg-surface text-on-surface text-body-base focus:outline-none focus:border-primary" />
        </div>
        <p v-if="error" class="text-data-secondary text-error">{{ error }}</p>
        <button type="submit" :disabled="loading" class="w-full bg-primary-container text-on-primary-container px-4 py-3 rounded-lg font-medium transition-opacity disabled:opacity-50">
          <LoadingSpinner v-if="loading" class="h-4 w-4 mr-2 inline-block" />
          {{ loading ? 'Saving...' : 'Change Password' }}
        </button>
      </form>
    </div>

    <div class="bg-surface-container rounded-xl p-5 border border-surface-container-highest">
      <h3 class="text-data-primary text-on-surface mb-4">Session</h3>
      <button @click="handleLogout" class="w-full bg-error-container text-on-primary-container px-4 py-3 rounded-lg font-medium transition-opacity hover:opacity-90">
        Logout
      </button>
    </div>
  </div>
</template>
