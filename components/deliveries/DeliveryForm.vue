<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import { PAYMENT_MODES } from '~/types'
import type { Customer, Product } from '~/types/database'
import type { DeliveryCreatePayload } from '~/composables/useDeliveries'

const props = defineProps<{
  customers: Customer[]
  products: Product[]
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  submit: [data: DeliveryCreatePayload & { whatsapp?: boolean }]
}>()

const { fetchFavoriteProductId } = useCustomers()

const customerSearch = ref('')
const selectedCustomerId = ref<number | undefined>(undefined)
const deliveryDate = ref(toISODate(new Date()))
const notes = ref('')
const quantities = reactive<Record<number, number>>({})
const paidNow = ref(false)
const paymentMode = ref<typeof PAYMENT_MODES[number]>('cash')
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
  // Prefill the customer's most-frequently-ordered item — still removable, more addable.
  const favoriteProductId = await fetchFavoriteProductId(customer.id)
  if (favoriteProductId && !quantities[favoriteProductId]) {
    quantities[favoriteProductId] = 1
  }
}

function clearCustomer() {
  selectedCustomerId.value = undefined
  customerSearch.value = ''
  // Items selected so far were chosen in the context of that customer
  // (e.g. the favorite-item prefill) — start the item list fresh too.
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
const totalUnits = computed(() => selectedItems.value.reduce((sum, i) => sum + i.quantity, 0))

function buildPayload(): DeliveryCreatePayload | null {
  validationError.value = ''
  if (!selectedCustomerId.value) {
    validationError.value = 'Select a customer first.'
    return null
  }
  if (selectedItems.value.length === 0) {
    validationError.value = 'Add at least one item.'
    return null
  }
  return {
    customerId: selectedCustomerId.value,
    deliveryDate: deliveryDate.value,
    items: selectedItems.value,
    notes: notes.value || undefined,
    paymentStatus: paidNow.value ? 'paid' : 'pending',
    paymentMode: paidNow.value ? paymentMode.value : undefined,
  }
}

const submitMode = ref<'save-only' | 'save-whatsapp'>('save-only')

function handleSubmit() {
  const payload = buildPayload()
  if (!payload) return
  const withWhatsapp = submitMode.value === 'save-whatsapp'
  emit('submit', withWhatsapp ? { ...payload, whatsapp: true } : payload)
}
</script>

<template>
  <form class="space-y-lg pb-40" @submit.prevent="handleSubmit">
    <!-- 1. Customer Selection -->
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
        <div v-if="filteredCustomers.length > 0" class="mt-2 rounded-lg border border-surface-variant divide-y divide-surface-variant overflow-hidden bg-surface-container z-50">
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
          <p v-if="selectedCustomer.area" class="text-data-secondary text-outline mt-1">
            <Icon name="location_on" class="text-[14px] align-middle mr-1" />{{ selectedCustomer.area }}
          </p>
        </div>
        <button type="button" class="text-on-surface-variant hover:text-primary" @click="clearCustomer">
          <Icon name="close" class="text-lg" />
        </button>
      </div>
    </section>

    <!-- 2. Logistics -->
    <section class="bg-surface-container-low p-5 rounded-xl space-y-sm">
      <label class="text-data-secondary text-on-surface-variant block mb-2 uppercase tracking-wider">Delivery Date</label>
      <input
        v-model="deliveryDate"
        type="date"
        required
        class="block w-full pl-3 pr-3 py-3 border border-surface-variant rounded-lg bg-surface text-on-surface text-body-base focus:outline-none focus:border-primary"
      >
    </section>

    <!-- 3. Itemized Delivery -->
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
          <button
            type="button"
            class="w-8 h-8 rounded-full border border-surface-variant text-on-surface flex items-center justify-center hover:bg-surface-variant active:scale-95 transition-all"
            @click="dec(product.id)"
          >
            <Icon name="remove" class="text-lg" />
          </button>
          <span class="text-data-primary text-on-surface w-6 text-center">{{ quantities[product.id] ?? 0 }}</span>
          <button
            type="button"
            class="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center hover:opacity-90 active:scale-95 transition-all"
            @click="inc(product.id)"
          >
            <Icon name="add" class="text-lg" />
          </button>
        </div>
      </div>
    </section>

    <!-- 4. Additional Notes -->
    <section class="bg-surface-container-low p-5 rounded-xl space-y-sm">
      <label class="text-data-secondary text-on-surface-variant block mb-2 uppercase tracking-wider">Notes</label>
      <Textarea v-model="notes" placeholder="e.g., Deliver to rear entrance..." class="min-h-[80px]" />
    </section>

    <!-- 5. Payment -->
    <section class="bg-surface-container-low p-5 rounded-xl space-y-sm">
      <label class="text-data-secondary text-on-surface-variant block mb-3 uppercase tracking-wider">Payment Status</label>
      <div class="flex gap-sm">
        <button
          type="button"
          class="flex-1 px-4 py-3 rounded-lg font-medium transition-all border-2"
          :class="!paidNow ? 'border-primary-container bg-primary-container/30 text-on-primary-container font-bold' : 'border-outline-variant text-on-surface-variant bg-surface hover:bg-surface-variant'"
          @click="paidNow = false"
        >
          Pending — Pay Later
        </button>
        <button
          type="button"
          class="flex-1 px-4 py-3 rounded-lg font-medium transition-all border-2"
          :class="paidNow ? 'border-tertiary-container bg-tertiary-container/30 text-on-tertiary font-bold' : 'border-outline-variant text-on-surface-variant bg-surface hover:bg-surface-variant'"
          @click="paidNow = true"
        >
          Paid Now — Collect
        </button>
      </div>
      <div v-if="paidNow" class="pt-3 border-t border-surface-variant">
        <p class="text-data-secondary text-on-surface-variant mb-3">Select payment method:</p>
        <div class="flex gap-sm flex-wrap">
          <button
            v-for="mode in PAYMENT_MODES"
            :key="mode"
            type="button"
            class="px-4 py-2 rounded-full text-data-secondary capitalize transition-all border"
            :class="paymentMode === mode ? 'border-primary-container bg-primary-container/15 text-primary-container' : 'border-outline-variant text-on-surface-variant hover:bg-surface-variant'"
            @click="paymentMode = mode"
          >
            {{ mode }}
          </button>
        </div>
      </div>
    </section>

    <!-- 6. Order Summary -->
    <section class="bg-surface-container-high border border-surface-variant p-6 rounded-xl space-y-2">
      <h3 class="text-data-secondary text-on-surface-variant uppercase tracking-wider mb-2">Order Summary</h3>
      <div class="flex justify-between items-center text-body-base text-on-surface">
        <span>Items selected</span>
        <span>{{ selectedItems.length }} ({{ totalUnits }} units)</span>
      </div>
      <p class="text-data-tertiary text-on-surface-variant">Final pricing is calculated on save using each item's active price.</p>
    </section>

    <p v-if="validationError" class="text-data-secondary text-error">{{ validationError }}</p>
    <p v-if="props.error" class="text-data-secondary text-error">{{ props.error }}</p>

    <!-- Sticky Bottom Actions -->
    <div class="fixed bottom-16 inset-x-0 mx-auto max-w-[480px] bg-surface-container border-t border-surface-variant p-4 flex gap-4 z-30">
      <Button type="submit" variant="outline" class="flex-1 rounded-lg" :disabled="props.loading" @click="submitMode = 'save-only'">
        Save Only
      </Button>
      <Button type="submit" class="flex-[2] rounded-lg" :disabled="props.loading" @click="submitMode = 'save-whatsapp'">
        <LoadingSpinner v-if="props.loading" class="h-4 w-4 mr-2" />
        <Icon v-else name="send" class="text-base mr-2" />
        {{ props.loading ? 'Saving...' : 'Save & WhatsApp Receipt' }}
      </Button>
    </div>
  </form>
</template>
