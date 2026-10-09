<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'subtle' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
  }>(),
  { variant: 'subtle', size: 'md', type: 'button', disabled: false },
)

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium select-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50 disabled:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[.98]'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:brightness-110 shadow-[0_0_20px_-6px_var(--accent)]',
  subtle: 'bg-surface-2 text-text border border-border hover:border-accent/50 hover:bg-surface',
  outline: 'border border-border text-text hover:bg-surface-2',
  ghost: 'text-muted hover:text-text hover:bg-surface-2',
  danger: 'bg-danger text-danger-fg hover:brightness-110',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-xs rounded-md',
  md: 'h-10 px-4 text-sm rounded-md',
  lg: 'h-12 px-6 text-base rounded-lg',
  icon: 'h-10 w-10 rounded-md',
}

const classes = computed(() => cn(base, variants[props.variant], sizes[props.size]))
</script>

<template>
  <button :type="type" :disabled="disabled" :class="classes">
    <slot />
  </button>
</template>