<script setup lang="ts">
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { X } from '@lucide/vue'
import { cn } from '@/lib/utils'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ title: string; description?: string; class?: string }>()
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] data-[state=open]:anim-overlay-in data-[state=closed]:anim-overlay-out"
      />
      <DialogContent
        class="group fixed inset-0 z-50 flex items-end justify-center outline-none sm:items-center sm:p-4"
      >
        <div
          :class="
            cn(
              'pointer-events-auto flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-2xl group-data-[state=open]:anim-sheet-up sm:max-w-lg sm:rounded-2xl sm:group-data-[state=open]:anim-pop-in group-data-[state=closed]:anim-sheet-down',
              props.class,
            )
          "
        >
          <div class="flex items-start gap-3 border-b border-border p-4">
            <div class="min-w-0 flex-1">
              <DialogTitle class="text-base font-semibold text-text">{{ title }}</DialogTitle>
              <DialogDescription v-if="description" class="mt-0.5 text-xs text-muted">
                {{ description }}
              </DialogDescription>
            </div>
            <button
              type="button"
              class="rounded-md p-1 text-dim transition-colors hover:bg-surface-2 hover:text-text"
              aria-label="关闭"
              @click="open = false"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto p-4">
            <slot />
          </div>
          <div
            v-if="$slots.footer"
            class="flex flex-col-reverse gap-2 border-t border-border p-4 sm:flex-row sm:justify-end"
          >
            <slot name="footer" />
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>