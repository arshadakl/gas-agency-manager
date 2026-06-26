<script setup lang="ts">
import { Button } from '~/components/ui/button'
import type { DeliveryWithRelations } from '~/types/database'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const route = useRoute()
const { user } = useUserSession()
const { fetchDeliveries, loading } = useDeliveries()

const deliveries = ref<DeliveryWithRelations[]>([])
const mineOnly = ref(false)
const todayOnly = ref(route.query.today === 'true')

const canAdd = computed(() => user.value?.role !== 'viewer')

async function load() {
  const today = toISODate(new Date())
  deliveries.value = await fetchDeliveries({
    mine: mineOnly.value,
    ...(todayOnly.value ? { from: today, to: today } : {}),
  })
}

watch([mineOnly, todayOnly], load)
onMounted(load)
</script>

<template>
  <div class="px-margin-mobile py-lg flex flex-col gap-lg">
    <div class="flex items-center justify-between">
      <h1 class="text-headline-md text-on-surface">{{ todayOnly ? "Today's Deliveries" : 'Deliveries' }}</h1>
      <Button v-if="canAdd" size="icon" class="rounded-full" as-child>
        <NuxtLink to="/deliveries/new"><Icon name="add" /></NuxtLink>
      </Button>
    </div>

    <div class="flex gap-1.5 flex-wrap">
      <button
        class="rounded-full px-4 py-1.5 text-data-secondary transition-colors"
        :class="!mineOnly ? 'bg-primary-container text-on-primary-container font-bold' : 'border border-outline text-on-surface-variant'"
        @click="mineOnly = false"
      >
        All Deliveries
      </button>
      <button
        class="rounded-full px-4 py-1.5 text-data-secondary transition-colors"
        :class="mineOnly ? 'bg-primary-container text-on-primary-container font-bold' : 'border border-outline text-on-surface-variant'"
        @click="mineOnly = true"
      >
        My Deliveries
      </button>
      <button
        class="rounded-full px-4 py-1.5 text-data-secondary transition-colors border"
        :class="todayOnly ? 'border-primary text-primary bg-primary/10' : 'border-outline text-on-surface-variant'"
        @click="todayOnly = !todayOnly"
      >
        Today only
      </button>
    </div>

    <div v-if="loading && deliveries.length === 0" class="flex justify-center py-12">
      <LoadingSpinner />
    </div>
    <EmptyState v-else-if="deliveries.length === 0" title="No deliveries yet" />
    <div v-else class="flex flex-col gap-md">
      <DeliveryCard v-for="delivery in deliveries" :key="delivery.id" :delivery="delivery" />
    </div>
  </div>
</template>
