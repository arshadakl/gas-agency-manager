<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import type { User } from '~/types/database'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { user: currentUser } = useUserSession()
if (currentUser.value?.role !== 'admin') await navigateTo('/')

const { fetchUsers, createUser, updateUser, deleteUser, loading, error } = useAuth()

const users = ref<User[]>([])
const showForm = ref(false)
const userToDelete = ref<User | null>(null)
const showDeleteConfirm = ref(false)

async function load() {
  users.value = await fetchUsers()
}
onMounted(load)

async function handleCreate(data: { username: string; fullName: string; role: string; password: string }) {
  const created = await createUser(data)
  if (created) {
    showForm.value = false
    await load()
  }
}

async function toggleActive(targetUser: User) {
  await updateUser(targetUser.id, { isActive: !targetUser.isActive })
  await load()
}

async function handleDeleteConfirm() {
  if (!userToDelete.value) return
  const ok = await deleteUser(userToDelete.value.id)
  if (ok) {
    showDeleteConfirm.value = false
    userToDelete.value = null
    await load()
  }
}
</script>

<template>
  <div class="px-4 py-4">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-headline-md text-on-surface">Users</h2>
      <Button size="icon" class="rounded-full" @click="showForm = true">
        <Icon name="add" />
      </Button>
    </div>

    <div v-if="showForm" class="mb-4 rounded-lg border border-border p-4">
      <UserForm :loading="loading" :error="error" @submit="handleCreate" @cancel="showForm = false" />
    </div>

    <div class="rounded-lg border border-border overflow-hidden">
      <div v-for="u in users" :key="u.id" class="flex items-center justify-between border-b border-border px-4 py-3 last:border-0 gap-2">
        <div class="flex-1">
          <p class="text-sm font-medium">{{ u.fullName }}</p>
          <p class="text-xs text-muted-foreground">@{{ u.username }} · {{ u.role }}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <Badge :variant="u.isActive ? 'default' : 'secondary'" class="cursor-pointer" @click="toggleActive(u)">
            {{ u.isActive ? 'active' : 'inactive' }}
          </Badge>
          <button
            class="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors"
            @click="userToDelete = u; showDeleteConfirm = true"
            title="Delete user"
          >
            <Icon name="delete" class="text-sm" />
          </button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :open="showDeleteConfirm"
      title="Delete user?"
      :message="`Remove ${userToDelete?.fullName}? This cannot be undone.`"
      confirm-text="Yes, Delete"
      :destructive="true"
      :loading="loading"
      @confirm="handleDeleteConfirm"
      @cancel="showDeleteConfirm = false; userToDelete = null"
    />
  </div>
</template>
