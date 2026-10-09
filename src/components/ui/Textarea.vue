<script setup lang="ts">
defineOptions({ inheritAttrs: false })
import { cn } from '@/lib/utils'
const model = defineModel<string>({ default: '' })
</script>

<template>
  <textarea
    v-model="model"
    :class="
      cn(
        'flex min-h-24 w-full rounded-md border border-border bg-bg px-3 py-2 text-base text-text transition-colors placeholder:text-dim focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50',
      )
    "
    v-bind="$attrs"
  />
</template>