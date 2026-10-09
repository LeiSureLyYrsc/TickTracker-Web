<script setup lang="ts">
import { computed } from 'vue'
const props = withDefaults(defineProps<{ value?: number; max?: number }>(), { value: 0, max: 1 })
const pct = computed(() => {
  const m = props.max <= 0 ? 1 : props.max
  return Math.min(100, Math.max(0, (props.value / m) * 100))
})
</script>

<template>
  <div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
    <div
      class="h-full rounded-full bg-gradient-to-r from-accent-2 to-accent transition-[width] duration-300"
      :style="{ width: pct + '%' }"
    />
  </div>
</template>