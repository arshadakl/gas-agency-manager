<script setup lang="ts">
import { Button } from '~/components/ui/button'
import type { CustomerWithBalance, NewCustomer } from '~/types/database'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const { fetchCustomers, createCustomer, loading, error } = useCustomers()
const { user } = useUserSession()

const route = useRoute()
const search = ref('')
const customers = ref<CustomerWithBalance[]>([])
const showForm = ref(false)
const filter = ref<'active' | 'outstanding'>(route.query.filter === 'outstanding' ? 'outstanding' : 'active')

async function load() {
  customers.value = await fetchCustomers(search.value || undefined)
}

watch(search, () => load())
onMounted(load)

const filteredCustomers = computed(() =>
  filter.value === 'outstanding' ? customers.value.filter((c) => c.balance > 0) : customers.value,
)

async function handleCreate(data: NewCustomer) {
  const created = await createCustomer(data)
  if (created) {
    showForm.value = false
    await load()
  }
}
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg">
    <div class="flex items-end justify-between gap-md">
      <div>
        <h1 class="text-headline-md text-on-surface">Customers</h1>
        <p class="text-data-secondary text-on-surface-variant mt-1">See customers and who owes money.</p>
      </div>
      <Button v-if="user?.role === 'admin'" size="icon" class="rounded-full shrink-0" @click="showForm = true">
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
      <div class="flex bg-surface-container-low rounded-lg p-xs border border-outline-variant/30">
        <button
          class="flex-1 px-lg py-xs rounded-md text-data-primary text-sm transition-colors"
          :class="filter === 'active' ? 'bg-surface-variant text-on-surface shadow-sm' : 'text-on-surface-variant'"
          @click="filter = 'active'"
        >
          Active
        </button>
        <button
          class="flex-1 px-lg py-xs rounded-md text-data-primary text-sm transition-colors"
          :class="filter === 'outstanding' ? 'bg-surface-variant text-on-surface shadow-sm' : 'text-on-surface-variant'"
          @click="filter = 'outstanding'"
        >
          Pending
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
