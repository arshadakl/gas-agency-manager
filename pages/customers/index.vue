<script setup lang="ts">
import { Button } from '~/components/ui/button'
import type { CustomerWithBalance, NewCustomer } from '~/types/database'
import { getOutstandingLevel, OUTSTANDING_LEVELS, type OutstandingLevel } from '~/utils/outstanding'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { fetchCustomers, createCustomer, loading, error } = useCustomers()
const { user } = useUserSession()
const { t } = useLocale()

const route = useRoute()
const search = ref('')
const customers = ref<CustomerWithBalance[]>([])
const showForm = ref(false)
const filter = ref<'active' | 'outstanding'>(route.query.filter === 'outstanding' ? 'outstanding' : 'active')
const statusFilter = ref<'active' | 'archived'>('active')
const levelFilter = ref<OutstandingLevel | null>(null)
const severityLevels = OUTSTANDING_LEVELS.filter((l): l is Exclude<OutstandingLevel, 'clear'> => l !== 'clear')

function levelLabel(level: Exclude<OutstandingLevel, 'clear'>) {
  return level === 'warning' ? t('level_warning') : level === 'high' ? t('level_high') : t('level_critical')
}

async function load() {
  const isActive = statusFilter.value === 'archived' ? '0' as const : '1' as const
  customers.value = await fetchCustomers(search.value || undefined, isActive)
}

watch(search, () => load())
watch(statusFilter, () => load())
onMounted(load)

function selectAll() {
  filter.value = 'active'
  levelFilter.value = null
}

function toggleLevelFilter(level: Exclude<OutstandingLevel, 'clear'>) {
  levelFilter.value = levelFilter.value === level ? null : level
}

const filteredCustomers = computed(() => {
  if (filter.value !== 'outstanding') return customers.value
  return customers.value.filter((c) => {
    const level = getOutstandingLevel(c.pendingDeliveryCount)
    if (level === 'clear') return false
    return levelFilter.value ? level === levelFilter.value : true
  })
})

async function handleCreate(data: NewCustomer) {
  const created = await createCustomer(data)
  if (created) {
    showForm.value = false
    await load()
  }
}
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg pb-40">
    <div class="flex items-end justify-between gap-md">
      <div>
        <h1 class="text-headline-md text-on-surface">Customers</h1>
        <p class="text-data-secondary text-on-surface-variant mt-1">See customers and who owes money.</p>
      </div>
      <Button v-if="statusFilter === 'active' && (user?.role === 'admin' || user?.role === 'delivery')" size="icon" class="rounded-full shrink-0" @click="showForm = true">
        <Icon name="add" />
      </Button>
    </div>

    <div v-if="showForm" class="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
      <CustomerForm :loading="loading" :error="error" @submit="handleCreate" @cancel="showForm = false" />
    </div>

    <div class="flex flex-col gap-md">
      <div class="relative">
        <Icon name="search" class="absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input
          v-model="search"
          type="text"
          placeholder="Search by business name or phone..."
          class="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl pl-12 pr-md py-sm text-on-surface text-body-base focus:border-primary focus:outline-none placeholder:text-on-surface-variant/50"
        >
      </div>
      <!-- Active / Archived status filter -->
      <div v-if="user?.role === 'admin'" class="flex bg-surface-container-low rounded-lg p-xs border border-outline-variant/30">
        <button
          class="flex-1 px-lg py-xs rounded-md text-data-primary text-sm transition-colors"
          :class="statusFilter === 'active' ? 'bg-surface-variant text-on-surface shadow-sm' : 'text-on-surface-variant'"
          @click="statusFilter = 'active'"
        >
          Active
        </button>
        <button
          class="flex-1 px-lg py-xs rounded-md text-data-primary text-sm transition-colors"
          :class="statusFilter === 'archived' ? 'bg-surface-variant text-on-surface shadow-sm' : 'text-on-surface-variant'"
          @click="statusFilter = 'archived'"
        >
          Archived
        </button>
      </div>
      <!-- All / Outstanding filter (only when viewing active customers) -->
      <div v-if="statusFilter === 'active'" class="flex bg-surface-container-low rounded-lg p-xs border border-outline-variant/30">
        <button
          class="flex-1 px-lg py-xs rounded-md text-data-primary text-sm transition-colors"
          :class="filter === 'active' ? 'bg-surface-variant text-on-surface shadow-sm' : 'text-on-surface-variant'"
          @click="selectAll"
        >
          All
        </button>
        <button
          class="flex-1 px-lg py-xs rounded-md text-data-primary text-sm transition-colors"
          :class="filter === 'outstanding' ? 'bg-surface-variant text-on-surface shadow-sm' : 'text-on-surface-variant'"
          @click="filter = 'outstanding'"
        >
          Outstanding
        </button>
      </div>
      <div v-if="filter === 'outstanding'" class="flex gap-xs">
        <button
          v-for="level in severityLevels"
          :key="level"
          class="flex-1 px-sm py-xs rounded-full text-data-tertiary border transition-colors"
          :class="[
            levelFilter === level ? 'font-medium' : 'opacity-60',
            level === 'warning' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : '',
            level === 'high' ? 'bg-red-400/10 text-red-400 border-red-400/30' : '',
            level === 'critical' ? 'bg-error-container/40 text-error border-error/30' : '',
          ]"
          @click="toggleLevelFilter(level)"
        >
          {{ levelLabel(level) }}
        </button>
      </div>
    </div>

    <div v-if="loading && customers.length === 0" class="flex justify-center py-12">
      <LoadingSpinner />
    </div>
    <EmptyState v-else-if="filteredCustomers.length === 0" title="No customers found" />
    <div v-else class="grid grid-cols-1 gap-md">
      <CustomerCard v-for="customer in filteredCustomers" :key="customer.id" :customer="customer" />
    </div>
  </div>
</template>
