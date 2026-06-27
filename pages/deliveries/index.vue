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
  <div class="px-margin-mobile py-lg flex flex-col gap-lg pb-40">
    <div class="flex items-center justify-between">
      <h1 class="text-headline-md text-on-surface">{{ todayOnly ? "Today's Deliveries" : 'Deliveries' }}</h1>
      <Button v-if="canAdd" size="icon" class="rounded-full" as-child>
        <NuxtLink to="/deliveries/new"><Icon name="add" /></NuxtLink>
      </Button>
    </div>

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
    </div>
  </div>
</template>
