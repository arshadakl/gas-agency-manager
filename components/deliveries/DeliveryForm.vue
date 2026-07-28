<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import { PAYMENT_MODES } from '~/types'
import type { CustomerWithBalance, Product, DeliveryWithRelations } from '~/types/database'
import type { DeliveryCreatePayload } from '~/composables/useDeliveries'

interface DeliveryInitial {
  customerId: number
  deliveryDate: string
  totalAmount: number
  notes?: string | null
  items: Array<{ productId: number; quantity: number }>
  amountCollected?: number
}

const props = defineProps<{
  customers: CustomerWithBalance[]
  products: Product[]
  cylinderFullStock?: Record<number, number>
  loading?: boolean
  error?: string | null
  initial?: DeliveryInitial
}>()

const emit = defineEmits<{
  submit: [data: DeliveryCreatePayload & { whatsapp?: boolean }]
  cancel: []
}>()

const customerSearch = ref('')
const selectedCustomerId = ref<number | undefined>(undefined)
const deliveryDate = ref(toISODate(new Date()))
const notes = ref('')
const quantities = reactive<Record<number, number>>({})
const totalAmount = ref<number | ''>('')
const amountCollected = ref<number | ''>('')
const paymentMode = ref<typeof PAYMENT_MODES[number]>('cash')
const validationError = ref('')
const itemTab = ref<'cylinders' | 'accessories'>('cylinders')
const giveFree = ref(false)
const addFreeExpense = ref(false)

if (props.initial) {
  selectedCustomerId.value = props.initial.customerId
  deliveryDate.value = props.initial.deliveryDate
  totalAmount.value = props.initial.totalAmount
  notes.value = props.initial.notes ?? ''
  for (const item of props.initial.items) {
    quantities[item.productId] = item.quantity
  }
  if (props.initial.amountCollected && props.initial.amountCollected > 0) {
    amountCollected.value = props.initial.amountCollected
  }
}

const cylinderProducts = computed(() => props.products.filter((p) => p.type === 'cylinder'))
const accessoryProducts = computed(() => props.products.filter((p) => p.type === 'accessory'))
const activeProducts = computed(() => itemTab.value === 'cylinders' ? cylinderProducts.value : accessoryProducts.value)

const selectedCylinderCount = computed(() =>
  cylinderProducts.value.reduce((sum, p) => sum + (quantities[p.id] ?? 0), 0),
)
const selectedAccessoryCount = computed(() =>
  accessoryProducts.value.reduce((sum, p) => sum + (quantities[p.id] ?? 0), 0),
)

const selectedCustomer = computed(() => props.customers.find((c) => c.id === selectedCustomerId.value))

const filteredCustomers = computed(() => {
  if (!customerSearch.value || selectedCustomerId.value) return []
  const q = customerSearch.value.toLowerCase()
  return props.customers.filter((c) =>
    c.name.toLowerCase().includes(q) ||
    c.phone.includes(q) ||
    (c.contactPerson?.toLowerCase().includes(q) ?? false),
  ).slice(0, 5)
})

function isOutOfStock(product: Product): boolean {
  if (product.type !== 'cylinder' || !product.cylinderSize) return false
  const full = props.cylinderFullStock?.[product.cylinderSize]
  return full !== undefined && full <= 0
}

async function selectCustomer(customer: CustomerWithBalance) {
  selectedCustomerId.value = customer.id
  customerSearch.value = customer.name
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

function switchTab(tab: 'cylinders' | 'accessories') {
  if (tab === itemTab.value) return
  if (tab === 'cylinders' && selectedAccessoryCount.value > 0) {
    validationError.value = 'This delivery already has accessories. Save it first, then create a new cylinder delivery.'
    return
  }
  if (tab === 'accessories' && selectedCylinderCount.value > 0) {
    validationError.value = 'This delivery already has cylinders. Save it first, then create a new accessory delivery.'
    return
  }
  validationError.value = ''
  itemTab.value = tab
}

const selectedItems = computed(() =>
  Object.entries(quantities)
    .map(([productId, quantity]) => ({ productId: Number(productId), quantity }))
    .filter((i) => i.quantity > 0),
)
const totalUnits = computed(() => selectedItems.value.reduce((sum, i) => sum + i.quantity, 0))
const goesToOutstanding = computed(() => Math.max(Number(totalAmount.value || 0) - Number(amountCollected.value || 0), 0))

const selectedFreeItems = computed(() =>
  selectedItems.value.filter(i => {
    const product = props.products.find(p => p.id === i.productId)
    return product?.type === 'accessory' && giveFree.value
  }),
)

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
  if (!totalAmount.value || totalAmount.value <= 0) {
    validationError.value = 'Enter the total amount for this delivery.'
    return null
  }
  if (amountCollected.value && amountCollected.value < 0) {
    validationError.value = 'Amount received cannot be negative.'
    return null
  }
  if (amountCollected.value && amountCollected.value > 0 && !paymentMode.value) {
    validationError.value = 'Select a payment method.'
    return null
  }
  return {
    customerId: selectedCustomerId.value,
    deliveryDate: deliveryDate.value,
    totalAmount: totalAmount.value,
    items: selectedItems.value,
    notes: notes.value || undefined,
    amountCollected: Number(amountCollected.value || 0),
    paymentMode: amountCollected.value && amountCollected.value > 0 ? paymentMode.value : undefined,
    freeAccessories: (giveFree.value && addFreeExpense.value)
      ? selectedFreeItems.value.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          expenseAmount: Number(totalAmount.value || 0),
        }))
      : [],
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
        <Icon name="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" style="font-size:18px" />
        <input
          v-model="customerSearch"
          type="text"
          placeholder="Search customer..."
          class="block w-full pl-9 pr-3 py-3 border border-surface-variant rounded-lg bg-surface-container-highest text-on-surface text-body-base placeholder:text-on-surface-variant focus:outline-none focus:border-primary"
        >
        <div v-if="filteredCustomers.length > 0" class="absolute left-0 right-0 top-full mt-1 rounded-lg border border-surface-variant divide-y divide-surface-variant overflow-hidden bg-surface-container-high shadow-lg z-50">
          <button
            v-for="c in filteredCustomers"
            :key="c.id"
            type="button"
            class="w-full text-left px-4 py-2.5 hover:bg-surface-variant transition-colors"
            @click="selectCustomer(c)"
          >
            <p class="text-data-secondary text-on-surface">{{ c.name }}</p>
            <p class="text-data-tertiary text-on-surface-variant">
              {{ formatPhone(c.phone) }}<span v-if="c.contactPerson"> · {{ c.contactPerson }}</span>
            </p>
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
          <p v-if="selectedCustomer.balance > 0" class="text-data-secondary text-error mt-1">
            Already owes {{ formatCurrency(selectedCustomer.balance) }}
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
        class="block w-full py-3 border border-surface-variant rounded-lg bg-surface text-on-surface text-body-base focus:outline-none focus:border-primary"
      >
    </section>

    <!-- 3. Itemized Delivery -->
    <section class="bg-surface-container-low p-5 rounded-xl space-y-sm">
      <label class="text-data-secondary text-on-surface-variant block mb-3 uppercase tracking-wider">Items</label>

      <!-- Tabs: Cylinders / Accessories -->
      <div class="flex bg-surface-container rounded-full p-1 border border-outline-variant/20 mb-4">
        <button
          type="button"
          class="flex-1 py-2 rounded-full text-data-secondary font-medium transition-all"
          :class="itemTab === 'cylinders'
            ? 'bg-primary-container text-on-primary-container'
            : 'text-on-surface-variant hover:text-on-surface'"
          @click="switchTab('cylinders')"
        >
          Cylinders
          <span v-if="selectedCylinderCount > 0" class="ml-1 text-data-tertiary">({{ selectedCylinderCount }})</span>
        </button>
        <button
          type="button"
          class="flex-1 py-2 rounded-full text-data-secondary font-medium transition-all"
          :class="itemTab === 'accessories'
            ? 'bg-primary-container text-on-primary-container'
            : 'text-on-surface-variant hover:text-on-surface'"
          @click="switchTab('accessories')"
        >
          Accessories
          <span v-if="selectedAccessoryCount > 0" class="ml-1 text-data-tertiary">({{ selectedAccessoryCount }})</span>
        </button>
      </div>

      <div
        v-for="product in activeProducts"
        :key="product.id"
        class="flex items-center justify-between p-4 bg-surface rounded-lg border mb-3 last:mb-0 transition-colors"
        :class="[
          isOutOfStock(product) ? 'border-surface-variant opacity-50' :
          (quantities[product.id] ?? 0) > 0 ? 'border-primary/50' : 'border-surface-variant'
        ]"
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
              <span v-if="isOutOfStock(product)" class="ml-1 text-error font-medium">· No stock</span>
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="w-8 h-8 rounded-full border border-surface-variant text-on-surface flex items-center justify-center hover:bg-surface-variant active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="isOutOfStock(product)"
            @click="dec(product.id)"
          >
            <Icon name="remove" class="text-lg" />
          </button>
          <span class="text-data-primary text-on-surface w-6 text-center">{{ quantities[product.id] ?? 0 }}</span>
          <button
            type="button"
            class="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="isOutOfStock(product)"
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

    <!-- 5. Total Amount -->
    <section class="bg-surface-container-low p-5 rounded-xl space-y-sm">
      <label class="text-data-secondary text-on-surface-variant block mb-2 uppercase tracking-wider">Total Amount (₹)</label>
      <input
        v-model.number="totalAmount"
        type="number"
        inputmode="numeric"
        min="1"
        step="1"
        placeholder="e.g. 3600"
        class="block w-full px-3 py-3 border border-surface-variant rounded-lg bg-surface-container-highest text-on-surface text-body-base placeholder:text-on-surface-variant focus:outline-none focus:border-primary"
        required
      >
      <p class="text-data-tertiary text-on-surface-variant">Enter the agreed total for this delivery.</p>
    </section>

    <!-- 6. Payment -->
    <section class="bg-surface-container-low p-5 rounded-xl space-y-sm">
      <label class="text-data-secondary text-on-surface-variant block mb-2 uppercase tracking-wider">Amount Received Now (₹)</label>
      <input
        v-model.number="amountCollected"
        type="number"
        inputmode="numeric"
        min="0"
        step="1"
        placeholder="0"
        class="block w-full px-3 py-3 border border-surface-variant rounded-lg bg-surface-container-highest text-on-surface text-body-base placeholder:text-on-surface-variant focus:outline-none focus:border-primary"
      >
      <p class="text-data-tertiary text-on-surface-variant">
        Leave blank if paying later. Can be less or more than this delivery's total — covers old dues first.
      </p>
      <div v-if="Number(amountCollected) > 0" class="pt-3 border-t border-surface-variant">
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

    <!-- 7. Free Accessory (only for accessory deliveries) -->
    <section v-if="itemTab === 'accessories' && selectedAccessoryCount > 0" class="rounded-xl overflow-hidden">
      <button
        type="button"
        class="w-full flex items-center justify-between p-4 transition-colors"
        :class="giveFree ? 'bg-purple-500/10 border border-purple-500/30' : 'bg-surface-container-low border border-surface-variant'"
        @click="giveFree = !giveFree; addFreeExpense = giveFree"
      >
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="giveFree ? 'bg-purple-500/20 text-purple-500' : 'bg-surface-variant text-on-surface-variant'">
            <Icon name="redeem" class="text-lg" />
          </div>
          <div class="text-left">
            <p class="text-data-primary" :class="giveFree ? 'text-purple-500' : 'text-on-surface'">Give as Free</p>
            <p class="text-data-tertiary text-on-surface-variant">{{ selectedAccessoryCount }} accessory items will be free of charge</p>
          </div>
        </div>
        <div class="w-10 h-6 rounded-full transition-colors flex items-center px-0.5" :class="giveFree ? 'bg-purple-500 justify-end' : 'bg-surface-variant justify-start'">
          <div class="w-5 h-5 rounded-full bg-white shadow-sm" />
        </div>
      </button>
      <div v-if="giveFree" class="px-4 py-3 bg-purple-500/5 border-x border-b border-purple-500/20 space-y-3">
        <p class="text-data-tertiary text-on-surface-variant flex items-center gap-1.5">
          <Icon name="info" class="text-sm text-purple-500" />
          These accessories will be recorded as free — no charge to the customer.
        </p>
        <label class="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" v-model="addFreeExpense" class="w-4 h-4 rounded border-outline-variant accent-purple-500">
          <span class="text-data-secondary text-on-surface-variant">Add as expense</span>
        </label>
      </div>
    </section>

    <!-- 8. Order Summary -->
    <section class="bg-surface-container-high border border-surface-variant p-6 rounded-xl space-y-2">
      <h3 class="text-data-secondary text-on-surface-variant uppercase tracking-wider mb-2">Order Summary</h3>
      <div class="flex justify-between items-center text-body-base text-on-surface">
        <span>Items</span>
        <span>{{ selectedItems.length }} ({{ totalUnits }} units)</span>
      </div>
      <div class="flex justify-between items-center text-body-base text-on-surface border-t border-surface-variant pt-2 mt-2">
        <span class="font-medium">Total</span>
        <span class="text-headline-md text-primary-fixed-dim font-bold">
          {{ totalAmount ? formatCurrency(Number(totalAmount)) : '—' }}
        </span>
      </div>
      <div v-if="Number(amountCollected) > 0" class="flex justify-between items-center text-body-base text-success">
        <span>Collecting now</span>
        <span>{{ formatCurrency(Number(amountCollected)) }}</span>
      </div>
      <div v-if="totalAmount" class="flex justify-between items-center text-body-base" :class="goesToOutstanding > 0 ? 'text-error' : 'text-on-surface-variant'">
        <span>Goes to outstanding</span>
        <span>{{ formatCurrency(goesToOutstanding) }}</span>
      </div>
    </section>

    <p v-if="validationError" class="text-data-secondary text-error">{{ validationError }}</p>
    <p v-if="props.error" class="text-data-secondary text-error">{{ props.error }}</p>

    <!-- Sticky Bottom Actions -->
    <div class="fixed bottom-16 inset-x-0 mx-auto max-w-[480px] bg-surface-container border-t border-surface-variant p-4 flex gap-3 z-30">
      <button
        v-if="props.initial"
        type="button"
        class="rounded-lg bg-surface-container-highest text-on-surface border border-outline-variant/40 py-2.5 px-4 font-medium hover:bg-surface-variant transition-colors disabled:opacity-50"
        :disabled="props.loading"
        @click="emit('cancel')"
      >
        Cancel
      </button>
      <Button type="submit" variant="outline" class="flex-1 rounded-lg" :disabled="props.loading" @click="submitMode = 'save-only'">
        <LoadingSpinner v-if="props.loading" class="h-4 w-4 mr-2" />
        {{ props.loading ? 'Saving...' : 'Save' }}
      </Button>
      <Button type="submit" class="flex-[1.5] rounded-lg" :disabled="props.loading" @click="submitMode = 'save-whatsapp'">
        <LoadingSpinner v-if="props.loading" class="h-4 w-4 mr-2" />
        <Icon v-else name="chat" class="text-base mr-2" />
        {{ props.loading ? 'Saving...' : 'Save & WhatsApp' }}
      </Button>
    </div>
  </form>
</template>
