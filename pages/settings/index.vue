<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { user } = useUserSession()
const { hasFeature, refreshPermissions } = usePermissions()
await refreshPermissions()
const { theme, toggleTheme } = useTheme()
const { isInstallable, isInstalled, install } = usePwaInstall()
const { t } = useLocale()
const { showToast } = useToast()

type ClearTarget = 'deliveries' | 'purchases' | 'customers' | 'stock' | 'transactions'
const confirmClear = ref<ClearTarget | null>(null)
const clearing = ref(false)
const counts = ref<Record<ClearTarget, number>>({ deliveries: 0, purchases: 0, customers: 0, stock: 0, transactions: 0 })
const countsLoaded = ref(false)

const clearMeta: Record<ClearTarget, { label: string; desc: string; icon: string; countLabel: string }> = {
  deliveries:   { label: 'Clear All Deliveries', desc: 'Removes all delivery (selling) records and resets order statuses', icon: 'local_shipping', countLabel: 'deliveries' },
  purchases:    { label: 'Clear All Purchases', desc: 'Removes all purchase (buying) records from suppliers', icon: 'shopping_cart', countLabel: 'purchases' },
  customers:    { label: 'Clear All Customers', desc: 'Removes customers, deliveries, payments and orders', icon: 'groups', countLabel: 'customers' },
  stock:        { label: 'Reset Stock Data', desc: 'Resets all cylinder counts to zero and clears movement history', icon: 'inventory_2', countLabel: 'stock movements' },
  transactions: { label: 'Clear All Transactions', desc: 'Deletes all account transactions, expenses and resets balances to zero', icon: 'receipt_long', countLabel: 'records' },
}

async function loadCounts() {
  try {
    const res = await $fetch<{ data: Record<ClearTarget, number> }>('/api/admin/clear/counts')
    counts.value = res.data
    countsLoaded.value = true
  } catch { /* ignore */ }
}
onMounted(loadCounts)

async function handleClear() {
  if (!confirmClear.value) return
  clearing.value = true
  try {
    await $fetch(`/api/admin/clear/${confirmClear.value}`, { method: 'DELETE' })
    confirmClear.value = null
    await loadCounts()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : (e as { data?: { message?: string } })?.data?.message || 'Failed to clear data'
    showToast(msg, 'destructive')
  } finally {
    clearing.value = false
  }
}

const links = computed(() => [
  ...(hasFeature('purchases') ? [{ to: '/stock/purchases', label: 'Purchases', icon: 'shopping_cart' }] : []),
  ...(user.value?.role === 'admin' || user.value?.role === 'delivery' ? [{ to: '/settings/products', label: t('products_pricing'), icon: 'inventory_2' }] : []),
  ...(hasFeature('manage_users') ? [{ to: '/settings/users', label: t('users'), icon: 'groups' }] : []),
  ...(user.value?.role === 'admin' ? [{ to: '/settings/import', label: 'Import Customers (Notebook)', icon: 'upload_file' }] : []),
  { to: '/settings/account', label: t('my_account'), icon: 'account_circle' },
])
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-sm pb-40">
    <h1 class="text-headline-md text-on-surface mb-sm">{{ t('settings') }}</h1>

    <NuxtLink
      v-for="link in links"
      :key="link.to"
      :to="link.to"
      class="flex items-center gap-3 rounded-xl bg-surface-container p-4 border border-outline-variant/20 hover:border-outline-variant/40 transition-colors"
    >
      <Icon :name="link.icon" class="text-primary-fixed-dim" />
      <span class="text-data-primary text-on-surface">{{ link.label }}</span>
      <Icon name="chevron_right" class="text-on-surface-variant ml-auto" />
    </NuxtLink>

    <!-- Install app -->
    <button
      v-if="isInstallable"
      class="flex items-center gap-3 rounded-xl bg-primary-container/20 p-4 border border-primary-container/40 hover:bg-primary-container/30 transition-colors w-full text-left"
      @click="install"
    >
      <Icon name="install_mobile" class="text-primary-fixed-dim" />
      <div class="flex-1">
        <span class="text-data-primary text-on-surface">{{ t('install_app') }}</span>
        <p class="text-data-tertiary text-on-surface-variant mt-0.5">{{ t('install_hint') }}</p>
      </div>
      <Icon name="download" class="text-primary-fixed-dim ml-auto" />
    </button>
    <div
      v-else-if="isInstalled"
      class="flex items-center gap-3 rounded-xl bg-success/10 p-4 border border-success/20"
    >
      <Icon name="check_circle" class="text-success" />
      <span class="text-data-primary text-on-surface">{{ t('app_installed') }}</span>
    </div>

    <!-- Theme toggle -->
    <button
      class="flex items-center gap-3 rounded-xl bg-surface-container p-4 border border-outline-variant/20 hover:border-outline-variant/40 transition-colors w-full text-left"
      @click="toggleTheme"
    >
      <Icon :name="theme === 'dark' ? 'dark_mode' : 'light_mode'" class="text-primary-fixed-dim" />
      <div class="flex-1">
        <span class="text-data-primary text-on-surface">{{ t('theme') }}</span>
        <p class="text-data-tertiary text-on-surface-variant mt-0.5">
          {{ theme === 'dark' ? t('theme_dark_hint') : t('theme_light_hint') }}
        </p>
      </div>
      <div
        class="w-12 h-6 rounded-full transition-colors flex items-center px-1"
        :class="theme === 'light' ? 'bg-tertiary-container' : 'bg-surface-container-highest'"
      >
        <div
          class="w-4 h-4 rounded-full bg-on-surface transition-all"
          :class="theme === 'light' ? 'translate-x-6' : 'translate-x-0'"
        />
      </div>
    </button>

    <!-- Danger zone — admin only -->
    <template v-if="user?.role === 'admin'">
      <div class="mt-lg pt-lg border-t border-error/20">
        <p class="text-data-secondary text-error mb-sm uppercase tracking-wider">Danger Zone</p>
        <div class="flex flex-col gap-sm">
          <button
            v-for="(meta, key) in clearMeta"
            :key="key"
            class="flex items-center gap-3 rounded-xl bg-error-container/10 p-4 border border-error/20 hover:bg-error-container/20 transition-colors w-full text-left"
            @click="confirmClear = key as ClearTarget"
          >
            <Icon :name="meta.icon" class="text-error" />
            <div class="flex-1">
              <span class="text-data-primary text-error">{{ meta.label }}</span>
              <p class="text-data-tertiary text-on-surface-variant mt-0.5">{{ meta.desc }}</p>
            </div>
            <Icon name="delete_forever" class="text-error/60 ml-auto" />
          </button>
        </div>
      </div>
    </template>

    <!-- Clear confirm modal -->
    <div
      v-if="confirmClear"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-8 sm:pb-0"
      @click.self="confirmClear = null"
    >
      <div class="w-full max-w-sm bg-surface-container-high rounded-2xl p-6 space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-error-container/30 flex items-center justify-center">
            <Icon name="warning" class="text-error" />
          </div>
          <div>
            <p class="text-data-primary text-on-surface font-semibold">{{ clearMeta[confirmClear].label }}</p>
            <p class="text-data-tertiary text-on-surface-variant mt-0.5">This cannot be undone</p>
          </div>
        </div>
        <p class="text-body-base text-on-surface-variant">{{ clearMeta[confirmClear].desc }}. All deleted data is permanent.</p>
        <div v-if="countsLoaded" class="rounded-lg bg-error-container/10 border border-error/20 px-3 py-2">
          <p class="text-data-secondary text-error">
            This will delete <span class="font-semibold">{{ counts[confirmClear].toLocaleString() }}</span> {{ clearMeta[confirmClear].countLabel }}
          </p>
        </div>
        <div class="flex gap-2 pt-1">
          <button
            class="flex-1 rounded-xl border border-outline-variant/40 py-2.5 text-body-base text-on-surface-variant hover:bg-surface-variant transition-colors"
            @click="confirmClear = null"
          >Cancel</button>
          <button
            class="flex-1 rounded-xl bg-error text-on-error py-2.5 text-body-base font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            :disabled="clearing"
            @click="handleClear"
          >
            <LoadingSpinner v-if="clearing" class="h-4 w-4 mx-auto" />
            <span v-else>Yes, Delete</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
