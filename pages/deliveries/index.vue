<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { CYLINDER_SIZES } from '~/types'
import type { DeliveryWithRelations, CustomerWithBalance } from '~/types/database'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const route = useRoute()
const { user } = useUserSession()
const { fetchDeliveries, loading } = useDeliveries()
const { collectEmpties, loading: collectLoading, error: collectError } = useInventory()
const { fetchCustomers } = useCustomers()
const { showToast } = useToast()

const deliveries = ref<DeliveryWithRelations[]>([])
const customers = ref<CustomerWithBalance[]>([])
const mineOnly = ref(false)
const todayOnly = ref(route.query.today === 'true')

// Pagination state — one week at a time, newest first
const oldestFrom = ref('')     // tracks oldest date loaded so far
const allLoaded = ref(false)   // true when a week returned 0 results

const canAdd = computed(() => user.value?.role !== 'viewer')
const canWrite = computed(() => user.value?.role !== 'viewer')

function getWeekRange(weeksBack: number): { from: string; to: string } {
  const today = new Date()
  const to = new Date(today)
  to.setDate(to.getDate() - weeksBack * 7)
  const from = new Date(to)
  from.setDate(from.getDate() - 6)
  return { from: toISODate(from), to: toISODate(to) }
}

async function load() {
  deliveries.value = []
  allLoaded.value = false
  const { from, to } = getWeekRange(0)
  oldestFrom.value = from
  const [rows, customerRows] = await Promise.all([
    fetchDeliveries({ mine: mineOnly.value, from, to }),
    fetchCustomers(),
  ])
  deliveries.value = rows
  customers.value = customerRows
  if (rows.length === 0) allLoaded.value = true
}

async function loadToday() {
  deliveries.value = []
  allLoaded.value = true
  const today = toISODate(new Date())
  const [rows, customerRows] = await Promise.all([
    fetchDeliveries({ mine: mineOnly.value, from: today, to: today }),
    fetchCustomers(),
  ])
  deliveries.value = rows
  customers.value = customerRows
}

async function loadMore() {
  const prevTo = new Date(oldestFrom.value)
  prevTo.setDate(prevTo.getDate() - 1)
  const prevFrom = new Date(prevTo)
  prevFrom.setDate(prevFrom.getDate() - 6)
  const from = toISODate(prevFrom)
  const to = toISODate(prevTo)
  oldestFrom.value = from
  const rows = await fetchDeliveries({ mine: mineOnly.value, from, to })
  if (rows.length === 0) {
    allLoaded.value = true
  } else {
    deliveries.value = [...deliveries.value, ...rows]
  }
}

watch([mineOnly], () => {
  if (todayOnly.value) loadToday()
  else load()
})

watch(todayOnly, (val) => {
  if (val) loadToday()
  else load()
})

onMounted(() => {
  if (todayOnly.value) loadToday()
  else load()
})

// Collect empties panel
const showCollectPanel = ref(false)
const collectDate = ref(toISODate(new Date()))
const collectCustomerSearch = ref('')
const collectSelectedCustomerId = ref<number | null>(null)
const collectNotes = ref('')
const collectQtys = reactive<Record<number, number>>({})

const collectSelectedCustomer = computed(() =>
  collectSelectedCustomerId.value ? customers.value.find(c => c.id === collectSelectedCustomerId.value) ?? null : null
)

const filteredCollectCustomers = computed(() => {
  if (!collectCustomerSearch.value || collectSelectedCustomerId.value) return []
  const q = collectCustomerSearch.value.toLowerCase()
  return customers.value
    .filter(c => c.isActive && c.name.toLowerCase().includes(q))
    .slice(0, 8)
})

function selectCollectCustomer(c: CustomerWithBalance) {
  collectSelectedCustomerId.value = c.id
  collectCustomerSearch.value = c.name
}

function clearCollectCustomer() {
  collectSelectedCustomerId.value = null
  collectCustomerSearch.value = ''
}

function resetCollectForm() {
  collectDate.value = toISODate(new Date())
  collectCustomerSearch.value = ''
  collectSelectedCustomerId.value = null
  collectNotes.value = ''
  for (const k of Object.keys(collectQtys)) delete collectQtys[Number(k)]
}

async function handleCollectEmpties() {
  const items = CYLINDER_SIZES.filter((s) => (collectQtys[s] ?? 0) > 0).map((s) => ({
    sizeKg: s,
    qty: collectQtys[s]!,
  }))
  if (items.length === 0) return
  if (!collectSelectedCustomer.value) {
    showToast('Select a customer', 'destructive')
    return
  }
  const ok = await collectEmpties({
    date: collectDate.value,
    items,
    notes: collectNotes.value || undefined,
    customerName: collectSelectedCustomer.value.name,
  })
  if (ok) {
    showToast('Empty cylinders recorded')
    showCollectPanel.value = false
    resetCollectForm()
  } else {
    showToast(collectError.value || 'Failed to record empties', 'destructive')
  }
}
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg pb-40">
    <div class="flex items-center justify-between">
      <h1 class="text-headline-md text-on-surface">{{ todayOnly ? "Today's Deliveries" : 'Deliveries' }}</h1>
      <div class="flex gap-2">
        <Button v-if="canWrite" size="icon" variant="outline" class="rounded-full" title="Collect empty cylinders" @click="showCollectPanel = !showCollectPanel">
          <Icon name="move_to_inbox" />
        </Button>
        <Button v-if="canAdd" size="icon" class="rounded-full" as-child>
          <NuxtLink to="/deliveries/new"><Icon name="add" /></NuxtLink>
        </Button>
      </div>
    </div>

    <!-- Collect Empties Panel -->
    <div v-if="showCollectPanel" class="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4 flex flex-col gap-sm">
      <div class="flex items-center justify-between mb-1">
        <p class="text-data-primary text-on-surface font-medium">Collect Empty Cylinders</p>
        <button class="text-on-surface-variant" @click="showCollectPanel = false; resetCollectForm()">
          <Icon name="close" />
        </button>
      </div>
      <input
        v-model="collectDate"
        type="date"
        class="block w-full px-3 py-2 border border-outline-variant/50 rounded-lg bg-surface-container-highest text-on-surface text-body-base focus:outline-none focus:border-primary"
      >
      <!-- Customer search -->
      <div v-if="!collectSelectedCustomer" class="relative">
        <Icon name="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm" />
        <input
          v-model="collectCustomerSearch"
          type="text"
          placeholder="Search customer..."
          class="w-full pl-9 pr-3 py-2 border border-outline-variant/50 rounded-lg bg-surface-container-highest text-on-surface text-body-base placeholder:text-on-surface-variant focus:outline-none focus:border-primary"
        >
        <div v-if="filteredCollectCustomers.length > 0" class="absolute left-0 right-0 top-full mt-1 rounded-lg border border-outline-variant/30 divide-y divide-outline-variant/20 overflow-hidden bg-surface-container-high shadow-lg z-20">
          <button
            v-for="c in filteredCollectCustomers"
            :key="c.id"
            type="button"
            class="w-full text-left px-3 py-2.5 hover:bg-surface-container-highest transition-colors"
            @click="selectCollectCustomer(c)"
          >
            <p class="text-data-primary text-on-surface">{{ c.name }}</p>
            <p v-if="c.contactPerson" class="text-data-tertiary text-on-surface-variant">{{ c.contactPerson }}<span v-if="c.area"> · {{ c.area }}</span></p>
          </button>
        </div>
      </div>
      <div v-else class="flex items-center justify-between rounded-lg border border-outline-variant/30 bg-surface-container px-3 py-2">
        <div>
          <p class="text-data-primary text-on-surface">{{ collectSelectedCustomer.name }}</p>
          <p v-if="collectSelectedCustomer.contactPerson" class="text-data-tertiary text-on-surface-variant">{{ collectSelectedCustomer.contactPerson }}</p>
        </div>
        <button type="button" class="text-on-surface-variant hover:text-on-surface" @click="clearCollectCustomer">
          <Icon name="close" class="text-sm" />
        </button>
      </div>
      <div class="flex flex-col gap-2">
        <div v-for="size in CYLINDER_SIZES" :key="size" class="flex items-center justify-between">
          <span class="text-data-secondary text-on-surface-variant">{{ size }}kg empties</span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="w-8 h-8 rounded-full border border-outline-variant/50 text-on-surface flex items-center justify-center hover:bg-surface-variant"
              @click="collectQtys[size] = Math.max(0, (collectQtys[size] ?? 0) - 1)"
            >
              <Icon name="remove" class="text-sm" />
            </button>
            <span class="text-data-primary text-on-surface w-6 text-center">{{ collectQtys[size] ?? 0 }}</span>
            <button
              type="button"
              class="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center hover:opacity-90"
              @click="collectQtys[size] = (collectQtys[size] ?? 0) + 1"
            >
              <Icon name="add" class="text-sm" />
            </button>
          </div>
        </div>
      </div>
      <input
        v-model="collectNotes"
        type="text"
        placeholder="Notes (optional)"
        class="block w-full px-3 py-2 border border-outline-variant/50 rounded-lg bg-surface-container-highest text-on-surface text-body-base placeholder:text-on-surface-variant focus:outline-none focus:border-primary"
      >
      <Button :disabled="collectLoading" @click="handleCollectEmpties">
        <LoadingSpinner v-if="collectLoading" class="h-4 w-4 mr-2" />
        Record Empty Cylinders
      </Button>
    </div>

    <!-- Filters -->
    <div class="flex gap-1.5 flex-wrap items-center">
      <button
        class="rounded-full px-4 py-1.5 text-data-secondary transition-colors"
        :class="!mineOnly ? 'bg-primary-container text-on-primary-container font-bold' : 'border border-outline text-on-surface-variant'"
        @click="mineOnly = false"
      >
        All
      </button>
      <button
        class="rounded-full px-4 py-1.5 text-data-secondary transition-colors"
        :class="mineOnly ? 'bg-primary-container text-on-primary-container font-bold' : 'border border-outline text-on-surface-variant'"
        @click="mineOnly = true"
      >
        Mine
      </button>
      <span class="w-px h-5 bg-outline-variant/50 mx-1" />
      <button
        class="rounded-full px-4 py-1.5 text-data-secondary transition-colors"
        :class="todayOnly ? 'bg-tertiary-container/30 border border-tertiary-container text-on-surface font-medium' : 'border border-outline-variant/50 text-on-surface-variant'"
        @click="todayOnly = !todayOnly"
      >
        Today
      </button>
    </div>

    <div v-if="loading && deliveries.length === 0" class="flex justify-center py-12">
      <LoadingSpinner />
    </div>
    <EmptyState v-else-if="deliveries.length === 0" title="No deliveries yet" />
    <div v-else class="flex flex-col gap-md">
      <DeliveryCard v-for="delivery in deliveries" :key="delivery.id" :delivery="delivery" @paid="load()" />

      <!-- Load More (week by week) -->
      <div v-if="!todayOnly" class="pt-2 flex flex-col items-center gap-2">
        <button
          v-if="!allLoaded"
          class="rounded-full border border-outline-variant/50 px-6 py-2 text-data-secondary text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-50"
          :disabled="loading"
          @click="loadMore"
        >
          <LoadingSpinner v-if="loading" class="h-4 w-4 inline mr-2" />
          Load previous week
        </button>
        <p v-else class="text-data-tertiary text-on-surface-variant">All deliveries loaded</p>
      </div>
    </div>
  </div>
</template>
