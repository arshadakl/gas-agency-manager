<script setup lang="ts">
import type { SelectTriggerProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { ChevronDown } from "lucide-vue-next"
import { SelectIcon, SelectTrigger, useForwardProps } from "reka-ui"
import { cn } from '~/utils'

const props = defineProps<SelectTriggerProps & { class?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class")

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <SelectTrigger
    v-bind="forwardedProps"
    :class="cn(
      'flex h-10 w-full items-center justify-between rounded-xl border border-outline-variant/40 bg-surface-container-highest px-3 py-2 text-data-secondary text-on-surface ring-offset-background data-[placeholder]:text-on-surface-variant focus:outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 [&>span]:truncate text-start transition-colors',
      props.class,
    )"
  >
    <slot />
    <SelectIcon as-child>
      <ChevronDown class="w-4 h-4 text-on-surface-variant shrink-0" />
    </SelectIcon>
  </SelectTrigger>
</template>
