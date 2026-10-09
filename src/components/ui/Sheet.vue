<script setup lang="ts">
import { DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { X } from '@lucide/vue'
import { cn } from '@/lib/utils'

const open = defineModel<boolean>('open', { default: false })
const props = withDefaults(defineProps<{ side?: 'left' | 'right' }>(), { side: 'left' })
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-50 bg-black/70 data-[state=open]:anim-overlay-in data-[state=closed]:anim-overlay-out"
      />
      <DialogContent
        :class="
          cn(
            'group fixed top-0 z-50 flex h-full w-72 flex-col border-border bg-surface shadow-2xl outline-none',
            props.side === 'right'
              ? 'right-0 border-l data-[state=open]:anim-slide-left'
              : 'left-0 border-r data-[state=open]:anim-slide-right',
          )
        "
      >
        <DialogTitle class="sr-only">菜单</DialogTitle>
        <div class="flex items-center justify-between border-b border-border p-4">
          <slot name="title"><span class="text-sm font-semibold text-muted">菜单</span></slot>
          <button
            type="button"
            class="rounded-md p-1 text-dim transition-colors hover:bg-surface-2 hover:text-text"
            aria-label="关闭"
            @click="open = false"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto p-3"><slot /></div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>