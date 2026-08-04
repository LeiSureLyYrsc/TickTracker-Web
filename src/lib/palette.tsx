import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

const SEED_KEY = 'ct_seed'

export const DEFAULT_SEED = '#98D8A8'

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
