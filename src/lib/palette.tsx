import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

const SEED_KEY = 'ct_seed'

export const DEFAULT_SEED = '#387a23'

export interface PalettePreset {
  name: string
  seed: string
}

export const PRESETS: PalettePreset[] = [
  { name: '绿色', seed: '#387a23' },
  { name: '默认紫', seed: '#6750a4' },
  { name: '蓝色', seed: '#0b57d0' },
  { name: '天蓝', seed: '#00639b' },
  { name: '青色', seed: '#006a6a' },
  { name: '橙色', seed: '#8b5000' },
  { name: '红色', seed: '#ba1a1a' },
  { name: '玫红', seed: '#c0005e' },
  { name: '棕褐', seed: '#6d4c41' },
]

interface PaletteContextValue {
  seed: string
  setSeed: (seed: string) => void
}

const PaletteContext = createContext<PaletteContextValue>({
  seed: DEFAULT_SEED,
  setSeed: () => {},
})

export function PaletteProvider({ children }: { children: ReactNode }) {
  const [seed, setSeedState] = useState<string>(
    () => localStorage.getItem(SEED_KEY) || DEFAULT_SEED,
  )

  const setSeed = useCallback((s: string) => {
    setSeedState(s)
    localStorage.setItem(SEED_KEY, s)
  }, [])

  return <PaletteContext.Provider value={{ seed, setSeed }}>{children}</PaletteContext.Provider>
}

export function usePalette(): PaletteContextValue {
  return useContext(PaletteContext)
}
