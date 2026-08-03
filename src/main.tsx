import { StrictMode, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript'
import App from './App'
import { createAppTheme } from './theme'
import { PaletteProvider, usePalette } from './lib/palette'

function ThemedApp() {
  const { seed } = usePalette()
  const theme = useMemo(() => createAppTheme(seed), [seed])
  return (
    <ThemeProvider theme={theme}>
      <InitColorSchemeScript defaultMode="system" />
      <CssBaseline />
      <App />
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PaletteProvider>
      <ThemedApp />
    </PaletteProvider>
  </StrictMode>,
)
