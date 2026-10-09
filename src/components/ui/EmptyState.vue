<script setup lang="ts">
defineProps<{ title: string; hint?: string }>()
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-2 py-14 text-center">
    <slot name="icon" />
    <p class="text-sm font-medium text-muted">{{ title }}</p>
    <p v-if="hint" class="text-xs text-dim">{{ hint }}</p>
    <slot />
  </div>
</template>