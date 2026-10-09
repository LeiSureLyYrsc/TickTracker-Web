<script setup lang="ts">
import {
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui'
import { Check, ChevronDown } from '@lucide/vue'
import { cn } from '@/lib/utils'

defineProps<{
  options: { value: string; label: string }[]
  placeholder?: string
  class?: string
}>()
const model = defineModel<string>({ default: '' })
</script>

<template>
  <SelectRoot v-model="model">
    <SelectTrigger
      :class="
        cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-md border border-border bg-bg px-3 text-sm text-text transition-colors data-[placeholder]:text-dim focus:outline-none focus:border-accent',
          $props.class,
        )
      "
    >
      <SelectValue :placeholder="placeholder" />
      <SelectIcon><ChevronDown class="h-4 w-4 opacity-60" /></SelectIcon>
    </SelectTrigger>
    <SelectPortal>
      <SelectContent
        position="popper"
        :side-offset="6"
        class="z-50 max-h-72 min-w-[10rem] overflow-hidden rounded-lg border border-border bg-surface text-text shadow-2xl data-[state=open]:anim-pop-in"
      >
        <SelectViewport class="p-1">
          <SelectItem
            v-for="o in options"
            :key="o.value"
            :value="o.value"
            class="relative flex cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-3 text-sm outline-none data-[highlighted]:bg-surface-2"
          >
            <span class="absolute left-2 flex h-4 w-4 items-center justify-center">
              <SelectItemIndicator><Check class="h-4 w-4 text-accent" /></SelectItemIndicator>
            </span>
            <SelectItemText>{{ o.label }}</SelectItemText>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>