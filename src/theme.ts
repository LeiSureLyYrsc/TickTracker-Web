import { createTheme, alpha } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'
import { argbFromHex, hexFromArgb, themeFromSourceColor } from '@material/material-color-utilities'

declare module '@mui/material/styles' {
  interface Palette {
    surfaceContainerLowest: string
    surfaceContainerLow: string
    surfaceContainer: string
    surfaceContainerHigh: string
    surfaceContainerHighest: string
    primaryContainer: string
    onPrimaryContainer: string
    secondaryContainer: string
    onSecondaryContainer: string
    errorContainer: string
    onErrorContainer: string
    outline: string
    outlineVariant: string
    inverseSurface: string
    inverseOnSurface: string
    inversePrimary: string
  }
  interface PaletteOptions {
    surfaceContainerLowest?: string
    surfaceContainerLow?: string
    surfaceContainer?: string
    surfaceContainerHigh?: string
    surfaceContainerHighest?: string
    primaryContainer?: string
    onPrimaryContainer?: string
    secondaryContainer?: string
    onSecondaryContainer?: string
    errorContainer?: string
    onErrorContainer?: string
    outline?: string
    outlineVariant?: string
    inverseSurface?: string
    inverseOnSurface?: string
    inversePrimary?: string
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    tonal: true
  }
}

type M3Scheme = Record<string, number>

function schemePalette(scheme: M3Scheme) {
  const h = (k: string) => hexFromArgb(scheme[k] ?? scheme.surface)
  return {
    primary: { main: h('primary'), contrastText: h('onPrimary') },
    secondary: { main: h('secondary'), contrastText: h('onSecondary') },
    error: { main: h('error'), contrastText: h('onError') },
    background: { default: h('surface'), paper: h('surfaceContainerLow') },
    text: { primary: h('onSurface'), secondary: h('onSurfaceVariant') },
    divider: h('outlineVariant'),
    surfaceContainerLowest: h('surfaceContainerLowest'),
    surfaceContainerLow: h('surfaceContainerLow'),
    surfaceContainer: h('surfaceContainer'),
    surfaceContainerHigh: h('surfaceContainerHigh'),
    surfaceContainerHighest: h('surfaceContainerHighest'),
    primaryContainer: h('primaryContainer'),
    onPrimaryContainer: h('onPrimaryContainer'),
    secondaryContainer: h('secondaryContainer'),
    onSecondaryContainer: h('onSecondaryContainer'),
    errorContainer: h('errorContainer'),
    onErrorContainer: h('onErrorContainer'),
    outline: h('outline'),
    outlineVariant: h('outlineVariant'),
    inverseSurface: h('inverseSurface'),
    inverseOnSurface: h('inverseOnSurface'),
    inversePrimary: h('inversePrimary'),
  }
}

export function createAppTheme(seed: string): Theme {
  const source = argbFromHex(seed)
  const md = themeFromSourceColor(source)
  const light = { palette: { mode: 'light' as const, ...schemePalette(md.schemes.light as unknown as M3Scheme) } }
  const dark = { palette: { mode: 'dark' as const, ...schemePalette(md.schemes.dark as unknown as M3Scheme) } }

  const theme = createTheme({
    cssVariables: { colorSchemeSelector: 'class' },
    colorSchemes: { light, dark },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
    },
    components: {
      MuiButton: {
        variants: [
          {
            props: { variant: 'tonal' },
            style: ({ theme }) => ({
              backgroundColor: theme.palette.primaryContainer,
              color: theme.palette.onPrimaryContainer,
              '&:hover': {
                backgroundColor: theme.palette.primaryContainer,
                filter: 'brightness(0.94)',
              },
            }),
          },
        ],
        styleOverrides: {
          root: ({ theme }) => ({
            textTransform: 'none',
            whiteSpace: 'nowrap',
            borderRadius: 999,
            height: 44,
            paddingLeft: 36,
            paddingRight: 36,
            fontWeight: 500,
          }),
        },
      },
      MuiChip: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 999,
            fontWeight: 500,
            height: 32,
            borderColor: theme.palette.outlineVariant,
          }),
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 28,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 12,
            border: `1px solid ${theme.palette.outlineVariant}`,
            backgroundColor: theme.palette.surfaceContainerLow,
            boxShadow: 'none',
          }),
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.palette.background.default,
            color: theme.palette.text.primary,
            boxShadow: 'none',
            borderBottom: `1px solid ${theme.palette.outlineVariant}`,
          }),
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: ({ theme }) => ({
            backgroundColor: theme.palette.surfaceContainerLow,
            borderRight: `1px solid ${theme.palette.outlineVariant}`,
          }),
        },
      },
      MuiSnackbarContent: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.palette.inverseSurface,
            color: theme.palette.inverseOnSurface,
            borderRadius: 4,
            boxShadow: `0 4px 8px 0 ${alpha('#000', 0.2)}, 0 8px 24px 0 ${alpha('#000', 0.14)}`,
          }),
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            padding: '16px 20px',
            fontSize: '0.875rem',
          },
          head: {
            fontWeight: 500,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 999,
          },
        },
      },
    },
  })

  // 将官方 CSS 变量调色盘（theme.vars.palette）合并回 theme.palette，
  // 使 sx / styleOverrides 中的颜色引用随明暗方案切换（theme.palette 默认是亮色写死值）。
  const themeWithVars = theme as unknown as {
    vars: { palette: Record<string, unknown> }
    palette: Record<string, unknown>
  }
  const varsPalette = themeWithVars.vars.palette
  const palette = themeWithVars.palette
  for (const key of Object.keys(varsPalette)) {
    if (key === 'mode') continue
    palette[key] = varsPalette[key]
  }

  return theme
}
