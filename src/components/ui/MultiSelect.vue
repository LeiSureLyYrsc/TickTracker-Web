<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { Check, ChevronDown, X } from '@lucide/vue'
import { computed, ref } from 'vue'
import { cn } from '@/lib/utils'

interface Opt {
  value: string
  label: string
  group?: string | null
}

const props = defineProps<{ options: Opt[]; placeholder?: string; class?: string }>()
const model = defineModel<string[]>({ default: () => [] })
const open = ref(false)
const q = ref('')

const filtered = computed(() => {
  const s = q.value.trim().toLowerCase()
  return s ? props.options.filter((o) => o.label.toLowerCase().includes(s)) : props.options
})
const selected = computed(() => props.options.filter((o) => model.value.includes(o.value)))

function toggle(v: string) {
  model.value = model.value.includes(v)
    ? model.value.filter((x) => x !== v)
    : [...model.value, v]
}
function remove(v: string) {
  model.value = model.value.filter((x) => x !== v)
}
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child>
      <button
        type="button"
        :class="
          cn(
            'flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-border bg-bg px-2.5 py-1.5 text-left text-sm text-text transition-colors hover:border-accent/50 focus:outline-none focus:border-accent',
            props.class,
          )
        "
      >
        <span v-if="selected.length === 0" class="text-dim">{{ placeholder }}</span>
        <span
          v-for="o in selected"
          :key="o.value"
          class="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/15 px-2 py-0.5 text-xs text-accent"
        >
          {{ o.label }}
          <span
            class="cursor-pointer opacity-70 hover:opacity-100"
            role="button"
            tabindex="-1"
            @click.stop="remove(o.value)"
          >
            <X class="h-3 w-3" />
          </span>
        </span>
        <ChevronDown class="ml-auto h-4 w-4 shrink-0 opacity-60" />
      </button>
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        :side-offset="6"
        align="start"
        class="z-50 w-64 rounded-lg border border-border bg-surface p-1 shadow-2xl data-[state=open]:anim-pop-in"
      >
        <div class="p-1">
          <input
            v-model="q"
            placeholder="搜索…"
            class="h-8 w-full rounded-md border border-border bg-bg px-2 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none"
          />
        </div>
        <div class="max-h-60 overflow-y-auto p-1">
          <p v-if="filtered.length === 0" class="px-2 py-3 text-center text-xs text-dim">无匹配</p>
          <template v-for="(o, i) in filtered" :key="o.value">
            <p
              v-if="o.group && (i === 0 || filtered[i - 1].group !== o.group)"
              class="px-2 pb-0.5 pt-2 text-[11px] font-medium text-dim"
            >
              {{ o.group }}
            </p>
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-text hover:bg-surface-2"
              @click="toggle(o.value)"
            >
              <span
                :class="
                  cn(
                    'flex h-4 w-4 items-center justify-center rounded border',
                    model.includes(o.value)
                      ? 'border-accent bg-accent text-accent-fg'
                      : 'border-border',
                  )
                "
              >
                <Check v-if="model.includes(o.value)" class="h-3 w-3" />
              </span>
              <span class="truncate">{{ o.label }}</span>
            </button>
          </template>
        </div>
        <div v-if="model.length" class="border-t border-border p-1">
          <button
            type="button"
            class="w-full rounded-md px-2 py-1.5 text-xs text-muted hover:bg-surface-2 hover:text-text"
            @click="model = []"
          >
            清除选择
          </button>
        </div>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>