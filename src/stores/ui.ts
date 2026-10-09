import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  applyAccent,
  applyTheme,
  persistAccent,
  persistTheme,
  readAccent,
  readTheme,
  resolveMode,
  type ThemeMode,
} from '@/lib/theme'

export const useUiStore = defineStore('ui', () => {
  const theme = ref<ThemeMode>(readTheme())
  const accent = ref<string>(readAccent())
  // 实际生效的明暗（system 时取决于系统偏好），供第三方组件（Toast 等）联动
  const resolved = ref<'light' | 'dark'>(resolveMode(readTheme()))

  function setTheme(mode: ThemeMode) {
    theme.value = mode
    persistTheme(mode)
    applyTheme(mode)
    resolved.value = resolveMode(mode)
  }

  function setAccent(hex: string) {
    accent.value = hex
    persistAccent(hex)
    applyAccent(hex)
  }

  function init() {
    applyTheme(theme.value)
    applyAccent(accent.value)
    resolved.value = resolveMode(theme.value)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (theme.value === 'system') {
        applyTheme('system')
        resolved.value = resolveMode('system')
      }
    }
    mq.addEventListener('change', handler)
  }

  return { theme, accent, resolved, setTheme, setAccent, init }
})
