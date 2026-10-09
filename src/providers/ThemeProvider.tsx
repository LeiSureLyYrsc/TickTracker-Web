import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  persistMode,
  persistSeed,
  readMode,
  readSeed,
  schemeVars,
  type ThemeMode,
} from '@/lib/theme'

interface ThemeContextValue {
  seed: string
  setSeed: (seed: string) => void
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  resolved: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function apply(seed: string, resolved: 'light' | 'dark') {
  const root = document.documentElement
  const vars = schemeVars(seed, resolved)
  for (const [key, value] of Object.entries(vars)) root.style.setProperty(key, value)
  root.classList.toggle('dark', resolved === 'dark')
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#101410' : '#f8faf7')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [seed, setSeedState] = useState<string>(readSeed)
  const [mode, setModeState] = useState<ThemeMode>(readMode)
  const [systemDark, setSystemDark] = useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => setSystemDark(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const resolved: 'light' | 'dark' =
    mode === 'system' ? (systemDark ? 'dark' : 'light') : mode

  useEffect(() => {
    apply(seed, resolved)
  }, [seed, resolved])

  const setSeed = useCallback((value: string) => {
    persistSeed(value)
    setSeedState(value)
  }, [])
  const setMode = useCallback((value: ThemeMode) => {
    persistMode(value)
    setModeState(value)
  }, [])

  const value = useMemo(
    () => ({ seed, setSeed, mode, setMode, resolved }),
    [seed, setSeed, mode, setMode, resolved],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme 必须在 ThemeProvider 内使用')
  return ctx
}