import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  applyAccent,
  applyTheme,
  persistAccent,
  persistTheme,
  readAccent,
  readTheme,
  type ThemeMode,
} from '@/lib/theme'

export const useUiStore = defineStore('ui', () => {
  const theme = ref<ThemeMode>(readTheme())
  const accent = ref<string>(readAccent())

  function setTheme(mode: ThemeMode) {
    theme.value = mode
    persistTheme(mode)
    applyTheme(mode)
  }

  function setAccent(hex: string) {
    accent.value = hex
    persistAccent(hex)
    applyAccent(hex)
  }

  function init() {
    applyTheme(theme.value)
    applyAccent(accent.value)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (theme.value === 'system') applyTheme('system')
    }
    mq.addEventListener('change', handler)
  }

  return { theme, accent, setTheme, setAccent, init }
})