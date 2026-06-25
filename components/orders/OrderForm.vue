<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import type { Customer, Product } from '~/types/database'
import type { OrderCreatePayload } from '~/composables/useOrders'

const props = defineProps<{
  customers: Customer[]
  products: Product[]
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  submit: [data: OrderCreatePayload]
}>()

const { fetchFavoriteProductId } = useCustomers()

const customerSearch = ref('')
const selectedCustomerId = ref<number | undefined>(undefined)
const orderDate = ref(toISODate(new Date()))
const notes = ref('')
const quantities = reactive<Record<number, number>>({})
const validationError = ref('')

const selectedCustomer = computed(() => props.customers.find((c) => c.id === selectedCustomerId.value))

const filteredCustomers = computed(() => {
  if (!customerSearch.value || selectedCustomerId.value) return []
  const q = customerSearch.value.toLowerCase()
  return props.customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)).slice(0, 6)
})

async function selectCustomer(customer: Customer) {
  selectedCustomerId.value = customer.id
  customerSearch.value = customer.name
  const favoriteProductId = await fetchFavoriteProductId(customer.id)
  if (favoriteProductId && !quantities[favoriteProductId]) {
    quantities[favoriteProductId] = 1
  }
}

function clearCustomer() {
  selectedCustomerId.value = undefined
  customerSearch.value = ''
  for (const key of Object.keys(quantities)) delete quantities[Number(key)]
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

function productIcon(product: Product) {
  if (product.type !== 'cylinder') return 'inventory_2'
  return product.cylinderSize === 33 ? 'propane_tank' : 'propane'
}

function inc(productId: number) {
  quantities[productId] = (quantities[productId] ?? 0) + 1
}
function dec(productId: number) {
  quantities[productId] = Math.max(0, (quantities[productId] ?? 0) - 1)
}

const selectedItems = computed(() =>
  Object.entries(quantities)
    .map(([productId, quantity]) => ({ productId: Number(productId), quantity }))
    .filter((i) => i.quantity > 0),
)

function handleSubmit() {
  validationError.value = ''
  if (!selectedCustomerId.value) {
    validationError.value = 'Select a customer first.'
    return
  }
  if (selectedItems.value.length === 0) {
    validationError.value = 'Add at least one item.'
    return
  }
  emit('submit', {
    customerId: selectedCustomerId.value,
    orderDate: orderDate.value,
    items: selectedItems.value,
    notes: notes.value || undefined,
  })
}
</script>

<template>
  <form class="space-y-lg" @submit.prevent="handleSubmit">
    <section class="bg-surface-container-low p-5 rounded-xl space-y-sm">
      <label class="text-data-secondary text-on-surface-variant block mb-2 uppercase tracking-wider">Customer</label>
      <div v-if="!selectedCustomer" class="relative">
        <Icon name="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg" />
        <input
          v-model="customerSearch"
          type="text"
          placeholder="Search customer..."
          class="block w-full pl-10 pr-3 py-3 border border-surface-variant rounded-lg bg-surface text-on-surface text-body-base placeholder-on-surface-variant focus:outline-none focus:border-primary"
        >
        <div v-if="filteredCustomers.length > 0" class="mt-2 rounded-lg border border-surface-variant divide-y divide-surface-variant overflow-hidden">
          <button
            v-for="c in filteredCustomers"
            :key="c.id"
            type="button"
            class="w-full text-left px-4 py-2.5 hover:bg-surface-variant transition-colors"
            @click="selectCustomer(c)"
          >
            <p class="text-data-secondary text-on-surface">{{ c.name }}</p>
            <p class="text-data-tertiary text-on-surface-variant">{{ formatPhone(c.phone) }}</p>
          </button>
        </div>
      </div>
      <div v-else class="p-4 bg-surface-container rounded-lg border border-surface-variant flex items-start gap-4">
        <div class="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-data-primary flex-shrink-0">
          {{ initials(selectedCustomer.name) }}
        </div>
        <div class="flex-1">
          <h3 class="text-data-primary text-on-surface">{{ selectedCustomer.name }}</h3>
          <p v-if="selectedCustomer.contactPerson" class="text-body-base text-on-surface-variant mt-1">{{ selectedCustomer.contactPerson }}</p>
        </div>
        <button type="button" class="text-on-surface-variant hover:text-primary" @click="clearCustomer">
          <Icon name="close" class="text-lg" />
        </button>
      </div>
    </section>

    <section class="bg-surface-container-low p-5 rounded-xl space-y-sm">
      <label class="text-data-tertiary text-on-surface-variant block mb-1">Booking Date</label>
      <input
        v-model="orderDate"
        type="date"
        required
        class="block w-full pl-3 pr-3 py-3 border border-surface-variant rounded-lg bg-surface text-on-surface text-body-base focus:outline-none focus:border-primary"
      >
    </section>

    <section class="bg-surface-container-low p-5 rounded-xl space-y-sm">
      <label class="text-data-secondary text-on-surface-variant block mb-4 uppercase tracking-wider">Items</label>
      <div
        v-for="product in products"
        :key="product.id"
        class="flex items-center justify-between p-4 bg-surface rounded-lg border mb-3 last:mb-0 transition-colors"
        :class="(quantities[product.id] ?? 0) > 0 ? 'border-primary/50' : 'border-surface-variant'"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-8 h-8 rounded flex items-center justify-center"
            :class="(quantities[product.id] ?? 0) > 0 ? 'bg-primary-container/20 text-primary' : 'bg-surface-variant text-on-surface-variant'"
          >
            <Icon :name="productIcon(product)" />
          </div>
          <div>
            <h4 class="text-data-primary text-on-surface">{{ product.name }}</h4>
            <p class="text-data-secondary text-on-surface-variant mt-1">
              {{ product.type === 'cylinder' ? `${product.cylinderSize}kg · Cylinder` : 'Accessory' }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button type="button" class="w-8 h-8 rounded-full border border-surface-variant text-on-surface flex items-center justify-center hover:bg-surface-variant active:scale-95 transition-all" @click="dec(product.id)">
            <Icon name="remove" class="text-lg" />
          </button>
          <span class="text-data-primary text-on-surface w-6 text-center">{{ quantities[product.id] ?? 0 }}</span>
          <button type="button" class="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center hover:opacity-90 active:scale-95 transition-all" @click="inc(product.id)">
            <Icon name="add" class="text-lg" />
          </button>
        </div>
      </div>
    </section>

    <section class="bg-surface-container-low p-5 rounded-xl space-y-sm">
      <label class="text-data-secondary text-on-surface-variant block mb-2 uppercase tracking-wider">Notes</label>
      <Textarea v-model="notes" placeholder="e.g., call before arriving" class="min-h-[80px]" />
    </section>

    <p v-if="validationError" class="text-data-secondary text-error">{{ validationError }}</p>
    <p v-if="props.error" class="text-data-secondary text-error">{{ props.error }}</p>

    <Button type="submit" class="w-full rounded-lg" :disabled="props.loading">
      <LoadingSpinner v-if="props.loading" class="h-4 w-4 mr-2" />
      {{ props.loading ? 'Saving...' : 'Save Order' }}
    </Button>
  </form>
</template>
