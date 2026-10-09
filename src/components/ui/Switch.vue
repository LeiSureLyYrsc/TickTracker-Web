<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'
const model = defineModel<boolean>({ default: false })
</script>

<template>
  <SwitchRoot
    v-model="model"
    class="inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-border bg-surface-2 transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
  >
    <SwitchThumb
      class="block h-5 w-5 translate-x-0.5 rounded-full bg-text transition-transform duration-200 data-[state=checked]:translate-x-[1.375rem] data-[state=checked]:bg-accent-fg"
    />
  </SwitchRoot>
</template>