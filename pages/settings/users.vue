<script setup lang="ts">
import { Button } from '~/components/ui/button'
import type { User } from '~/types/database'
import { FEATURE_KEYS, FEATURE_LABELS, ADMIN_ONLY_FEATURES } from '~/types'
import type { FeatureKey } from '~/types'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { user: currentUser } = useUserSession()
const { hasFeature, refreshPermissions } = usePermissions()
await refreshPermissions()
if (!hasFeature('manage_users')) await navigateTo('/')

const isAdmin = computed(() => currentUser.value?.role === 'admin')
const featureKeys = computed(() => {
  const all = Object.values(FEATURE_KEYS) as FeatureKey[]
  return isAdmin.value ? all : all.filter(f => !ADMIN_ONLY_FEATURES.includes(f))
})

const { fetchUsers, createUser, updateUser, deleteUser, loading, error } = useAuth()
const { showToast } = useToast()

const users = ref<User[]>([])
const showForm = ref(false)
const userToDelete = ref<User | null>(null)
const showDeleteConfirm = ref(false)
const userToResetPw = ref<User | null>(null)
const newPassword = ref('')
const pwError = ref<string | null>(null)
const expandedUserId = ref<number | null>(null)
const savingPermissions = ref(false)

function getUserDisabledFeatures(u: User): FeatureKey[] {
  if (!u.featuresDisabled) return []
  try {
    return JSON.parse(u.featuresDisabled) as FeatureKey[]
  } catch {
    return []
  }
}

function isFeatureDisabled(u: User, feature: FeatureKey): boolean {
  return getUserDisabledFeatures(u).includes(feature)
}

async function toggleFeature(u: User, feature: FeatureKey) {
  if (!u.publicId) return
  savingPermissions.value = true
  const current = getUserDisabledFeatures(u)
  const updated = current.includes(feature)
    ? current.filter(f => f !== feature)
    : [...current, feature]
  await updateUser(u.publicId, { featuresDisabled: updated })
  await load()
  savingPermissions.value = false
}

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
  if (!targetUser.publicId) return
  await updateUser(targetUser.publicId, { isActive: !targetUser.isActive })
  await load()
}

async function handleDeleteConfirm() {
  if (!userToDelete.value?.publicId) return
  const ok = await deleteUser(userToDelete.value.publicId)
  if (ok) {
    showDeleteConfirm.value = false
    userToDelete.value = null
    await load()
  }
}

function openPasswordReset(u: User) {
  userToResetPw.value = u
  newPassword.value = ''
  pwError.value = null
}

async function handleResetPassword() {
  pwError.value = null
  if (newPassword.value.length < 8) {
    pwError.value = 'Password must be at least 8 characters'
    return
  }
  if (!userToResetPw.value?.publicId) return
  const updated = await updateUser(userToResetPw.value.publicId, { newPassword: newPassword.value })
  if (updated) {
    userToResetPw.value = null
    newPassword.value = ''
    showToast('Password reset successfully')
  } else {
    showToast(error.value || 'Failed to reset password', 'destructive')
  }
}

function closePasswordReset() {
  userToResetPw.value = null
  pwError.value = null
  newPassword.value = ''
}
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg pb-40">
    <div class="flex items-center justify-between">
      <h2 class="text-headline-md text-on-surface">Users</h2>
      <Button v-if="isAdmin" size="icon" class="rounded-full" @click="showForm = true">
        <Icon name="add" />
      </Button>
    </div>

    <div v-if="showForm" class="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
      <UserForm :loading="loading" @submit="handleCreate" @cancel="showForm = false" />
    </div>

    <div class="rounded-xl border border-outline-variant/30 bg-surface-container overflow-hidden">
      <template v-for="u in users" :key="u.id">
        <!-- User row -->
        <div class="border-b border-outline-variant/20 last:border-0">
          <div class="flex items-center justify-between px-4 py-3 gap-2">
            <div class="flex-1 min-w-0">
              <p class="text-data-primary text-on-surface truncate">{{ u.fullName }}</p>
              <p class="text-data-tertiary text-on-surface-variant mt-0.5">@{{ u.username }} · {{ u.role }}</p>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <button
                class="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors"
                :class="expandedUserId === u.id ? 'bg-surface-container-high text-primary' : ''"
                title="Permissions"
                @click="expandedUserId = expandedUserId === u.id ? null : u.id"
              >
                <Icon name="tune" class="text-sm" />
              </button>
              <template v-if="isAdmin">
                <button
                  class="rounded-full px-3 py-1 text-data-tertiary border transition-colors"
                  :class="u.isActive
                    ? 'border-success/40 bg-success/10 text-success'
                    : 'border-outline-variant/30 bg-surface-container-highest text-on-surface-variant'"
                  @click="toggleActive(u)"
                >
                  {{ u.isActive ? 'Active' : 'Inactive' }}
                </button>
                <button
                  class="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors"
                  title="Reset password"
                  @click="openPasswordReset(u)"
                >
                  <Icon name="key" class="text-sm" />
                </button>
                <button
                  class="flex h-8 w-8 items-center justify-center rounded-full text-error hover:bg-error-container/30 transition-colors"
                  title="Delete user"
                  @click="userToDelete = u; showDeleteConfirm = true"
                >
                <Icon name="delete" class="text-sm" />
              </button>
              </template>
            </div>
          </div>

          <!-- Permissions section (expandable) -->
          <div v-if="expandedUserId === u.id" class="px-4 pb-3 pt-1 border-t border-outline-variant/10">
            <p class="text-data-secondary text-on-surface-variant mb-2 font-medium">Disable features for {{ u.fullName }}:</p>
            <div class="space-y-2">
              <label
                v-for="feature in featureKeys"
                :key="feature"
                class="flex items-center justify-between py-1.5 px-3 rounded-lg bg-surface-container-low"
              >
                <span class="text-data-secondary text-on-surface">{{ FEATURE_LABELS[feature] }}</span>
                <button
                  type="button"
                  role="switch"
                  :aria-checked="!isFeatureDisabled(u, feature)"
                  :disabled="savingPermissions"
                  class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50"
                  :class="isFeatureDisabled(u, feature)
                    ? 'bg-surface-container-highest border-outline-variant/40'
                    : 'bg-primary-container'"
                  @click="toggleFeature(u, feature)"
                >
                  <span
                    class="pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out mt-px"
                    :class="isFeatureDisabled(u, feature)
                      ? 'translate-x-0 bg-on-surface-variant'
                      : 'translate-x-5 bg-on-primary-container'"
                  />
                </button>
              </label>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Password reset modal -->
    <div
      v-if="userToResetPw"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-8 sm:pb-0"
      @click.self="closePasswordReset"
    >
      <div class="w-full max-w-sm bg-surface-container-high rounded-2xl p-6 space-y-4">
        <div>
          <p class="text-data-primary text-on-surface font-semibold">Reset Password</p>
          <p class="text-data-secondary text-on-surface-variant mt-0.5">{{ userToResetPw.fullName }}</p>
        </div>
        <div class="space-y-1">
          <label class="text-data-secondary text-on-surface-variant">New Password</label>
          <input
            v-model="newPassword"
            type="password"
            placeholder="Min 8 characters"
            class="w-full rounded-xl bg-surface-container-highest border border-outline-variant/40 px-3 py-2.5 text-on-surface text-body-base outline-none focus:border-tertiary-container transition-colors"
            @keyup.enter="handleResetPassword"
          />
        </div>
        <p v-if="pwError" class="text-sm text-error">{{ pwError }}</p>
        <div class="flex gap-2 pt-1">
          <button
            class="flex-1 rounded-xl border border-outline-variant/40 py-2.5 text-body-base text-on-surface-variant hover:bg-surface-variant transition-colors"
            @click="closePasswordReset"
          >Cancel</button>
          <button
            class="flex-1 rounded-xl bg-primary-container text-on-primary-container py-2.5 text-body-base font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            :disabled="loading"
            @click="handleResetPassword"
          >
            <LoadingSpinner v-if="loading" class="h-4 w-4 mx-auto" />
            <span v-else>Reset</span>
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
