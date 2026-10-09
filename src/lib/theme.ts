export type ThemeMode = 'dark' | 'light' | 'system'

const THEME_KEY = 'tt_theme'
const ACCENT_KEY = 'tt_accent'

export const DEFAULT_ACCENT = '#22D3EE'
export const ACCENT_PRESETS = ['#22D3EE', '#8B5CF6', '#34D399', '#F472B6', '#FBBF24', '#38BDF8']

export function readTheme(): ThemeMode {
  try {
    const m = localStorage.getItem(THEME_KEY)
    return m === 'dark' || m === 'light' || m === 'system' ? m : 'dark'
  } catch {
    return 'dark'
  }
}

export function persistTheme(mode: ThemeMode) {
  try {
    localStorage.setItem(THEME_KEY, mode)
  } catch {
    /* 忽略 */
  }
}

export function readAccent(): string {
  try {
    return localStorage.getItem(ACCENT_KEY) || DEFAULT_ACCENT
  } catch {
    return DEFAULT_ACCENT
  }
}

export function persistAccent(hex: string) {
  try {
    localStorage.setItem(ACCENT_KEY, hex)
  } catch {
    /* 忽略 */
  }
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHex(rgb: [number, number, number]): string {
  return '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
}

export function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  return toHex(rgb.map((v) => v * (1 - amount)) as [number, number, number])
}

export function contrastFg(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#04222a'
  const [r, g, b] = rgb
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#0b0e14' : '#ffffff'
}

export function applyTheme(mode: ThemeMode) {
  const resolved =
    mode === 'system'
      ? window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : mode
  document.documentElement.classList.toggle('light', resolved === 'light')
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#0B0E14' : '#F5F7FB')
}

export function applyAccent(hex: string) {
  const root = document.documentElement
  root.style.setProperty('--accent', hex)
  root.style.setProperty('--accent-2', darken(hex, 0.16))
  root.style.setProperty('--accent-fg', contrastFg(hex))
}