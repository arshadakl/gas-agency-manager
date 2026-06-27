<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Button } from '~/components/ui/button'

definePageMeta({
  layout: 'auth',
})

const { login, error, loading } = useAuth()

const username = ref('')
const password = ref('')

async function handleSubmit() {
  const ok = await login(username.value, password.value)
  if (ok) await navigateTo('/')
}
</script>

<template>
  <Card class="w-full max-w-sm">
    <CardHeader>
      <CardTitle class="text-center text-headline-md text-primary-fixed-dim">Tuvvur Super gas</CardTitle>
    </CardHeader>
    <CardContent>
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div class="space-y-1">
          <Label for="username">Username</Label>
          <Input id="username" v-model="username" autocomplete="username" required />
        </div>
        <div class="space-y-1">
          <Label for="password">Password</Label>
          <Input id="password" v-model="password" type="password" autocomplete="current-password" required />
        </div>
        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
        <Button type="submit" class="w-full" :disabled="loading">
          <LoadingSpinner v-if="loading" class="h-4 w-4 mr-2" />
          {{ loading ? 'Signing in...' : 'Sign in' }}
        </Button>
      </form>
    </CardContent>
  </Card>
</template>
