<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui'
import { Check, Monitor, Moon, Palette, Sun } from '@lucide/vue'
import { ACCENT_PRESETS, type ThemeMode } from '@/lib/theme'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const modes: { value: ThemeMode; label: string; icon: unknown }[] = [
  { value: 'dark', label: '暗色', icon: Moon },
  { value: 'light', label: '亮色', icon: Sun },
  { value: 'system', label: '跟随系统', icon: Monitor },
]
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger as-child>
      <button
        type="button"
        class="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-text"
        aria-label="主题设置"
      >
        <Palette class="h-4 w-4" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        align="end"
        :side-offset="6"
        class="z-50 w-56 rounded-xl border border-border bg-surface p-1 shadow-2xl data-[state=open]:anim-pop-in"
      >
        <DropdownMenuLabel class="px-2 py-1.5 text-[11px] font-medium text-dim">外观</DropdownMenuLabel>
        <DropdownMenuItem
          v-for="m in modes"
          :key="m.value"
          class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-text outline-none data-[highlighted]:bg-surface-2"
          @select="ui.setTheme(m.value)"
        >
          <component :is="m.icon" class="h-4 w-4" />
          <span>{{ m.label }}</span>
          <Check v-if="ui.theme === m.value" class="ml-auto h-4 w-4 text-accent" />
        </DropdownMenuItem>
        <DropdownMenuSeparator class="my-1 h-px bg-border" />
        <DropdownMenuLabel class="px-2 py-1.5 text-[11px] font-medium text-dim">强调色</DropdownMenuLabel>
        <div class="flex flex-wrap gap-2 px-2 py-2">
          <button
            v-for="c in ACCENT_PRESETS"
            :key="c"
            type="button"
            class="h-6 w-6 rounded-full border border-border transition-transform hover:scale-110"
            :style="{ background: c }"
            :aria-label="`强调色 ${c}`"
            @click="ui.setAccent(c)"
          />
        </div>
        <div class="px-2 pb-2">
          <input
            type="color"
            :value="ui.accent"
            aria-label="自定义强调色"
            class="h-8 w-full cursor-pointer rounded-md border border-border bg-transparent"
            @input="ui.setAccent(($event.target as HTMLInputElement).value)"
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>