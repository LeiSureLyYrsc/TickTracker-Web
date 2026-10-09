<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

type Variant = 'accent' | 'success' | 'warning' | 'danger' | 'muted' | 'outline'
const props = withDefaults(defineProps<{ variant?: Variant }>(), { variant: 'muted' })

const variants: Record<Variant, string> = {
  accent: 'bg-accent/15 text-accent border-accent/30',
  success: 'bg-success/15 text-success border-success/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
  muted: 'bg-surface-2 text-muted border-border',
  outline: 'bg-transparent text-muted border-border',
}
const classes = computed(
  () =>
    cn(
      'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium tnum',
      variants[props.variant],
    ),
)
</script>

<template>
  <span :class="classes"><slot /></span>
</template>