<script setup lang="ts">
import { Button } from '~/components/ui/button'
import type { Customer, Delivery } from '~/types/database'

const props = defineProps<{
  customer: Customer
  delivery: Delivery
}>()

const link = computed(() => {
  const message = `Hi ${props.customer.name}, your delivery on ${formatDate(props.delivery.deliveryDate)} for ${formatCurrency(props.delivery.totalAmount)} has been completed. Thank you!`
  return buildWhatsAppLink(props.customer.whatsappNumber ?? props.customer.phone, message)
})
</script>

<template>
  <Button as-child variant="outline" size="sm">
    <a :href="link" target="_blank" rel="noopener noreferrer">
      <Icon name="chat" class="text-base mr-1" /> WhatsApp
    </a>
  </Button>
</template>
