import { argbFromHex, hexFromArgb, themeFromSourceColor } from '@material/material-color-utilities'

export type ThemeMode = 'light' | 'dark' | 'system'

export const DEFAULT_SEED = '#98D8A8'

const SEED_KEY = 'tt_seed'
const MODE_KEY = 'tt_mode'

export function readSeed(): string {
  try {
    return localStorage.getItem(SEED_KEY) || DEFAULT_SEED
  } catch {
    return DEFAULT_SEED
  }
}

export function persistSeed(seed: string) {
  try {
    localStorage.setItem(SEED_KEY, seed)
  } catch {
    /* 忽略 */
  }
}

export function readMode(): ThemeMode {
  try {
    const m = localStorage.getItem(MODE_KEY)
    return m === 'light' || m === 'dark' || m === 'system' ? m : 'system'
  } catch {
    return 'system'
  }
}

export function persistMode(mode: ThemeMode) {
  try {
    localStorage.setItem(MODE_KEY, mode)
  } catch {
    /* 忽略 */
  }
}

export function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  }
  return mode
}

type Scheme = Record<string, number | undefined>

/**
 * 用种子色生成 Material You 亮/暗配色，产出可写入 CSS 变量的 token。
 * 生成失败（库异常/无效色值）时返回空对象，回退到 index.css 中的默认值。
 */
export function schemeVars(seed: string, scheme: 'light' | 'dark'): Record<string, string> {
  let s: Scheme
  try {
    const md = themeFromSourceColor(argbFromHex(seed))
    s = (scheme === 'dark' ? md.schemes.dark : md.schemes.light) as unknown as Scheme
  } catch {
    return {}
  }
  const h = (k: string): string | undefined => {
    const v = s[k]
    return typeof v === 'number' ? hexFromArgb(v) : undefined
  }
  const candidate: Record<string, string | undefined> = {
    '--background': h('surface'),
    '--foreground': h('onSurface'),
    '--card': h('surfaceContainerLow') ?? h('surface'),
    '--card-foreground': h('onSurface'),
    '--popover': h('surfaceContainer') ?? h('surface'),
    '--popover-foreground': h('onSurface'),
    '--primary': h('primary'),
    '--primary-foreground': h('onPrimary'),
    '--secondary': h('secondaryContainer'),
    '--secondary-foreground': h('onSecondaryContainer'),
    '--muted': h('surfaceContainerHighest') ?? h('surfaceContainerHigh'),
    '--muted-foreground': h('onSurfaceVariant'),
    '--accent': h('surfaceContainerHigh') ?? h('surfaceContainer'),
    '--accent-foreground': h('onSurface'),
    '--destructive': h('error'),
    '--destructive-foreground': h('onError'),
    '--border': h('outlineVariant'),
    '--input': h('outline'),
    '--ring': h('primary'),
  }
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(candidate)) {
    if (v) out[k] = v
  }
  return out
}
