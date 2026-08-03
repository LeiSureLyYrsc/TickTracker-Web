import { useEffect, useState, type ReactNode } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useColorScheme, useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import Divider from '@mui/material/Divider'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import MenuIcon from '@mui/icons-material/Menu'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import LogoutIcon from '@mui/icons-material/Logout'
import PaletteIcon from '@mui/icons-material/Palette'
import { clearAuth } from '../lib/auth'
import PaletteDialog from './PaletteDialog'

export interface NavItem {
  path: string
  icon: ReactNode
  label: string
}

export default function AppLayout({ nav }: { nav: NavItem[] }) {
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const { mode, systemMode, setMode } = useColorScheme()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && (mode === 'system' ? systemMode : mode) === 'dark'

  const active = nav.find((n) => location.pathname.startsWith(n.path)) ?? nav[0]

  function logout() {
    clearAuth()
    navigate('/')
  }

  const navList = (
    <Box
      sx={{
        width: 240,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        py: 2,
        px: 1,
      }}
    >
      <List sx={{ flexGrow: 1, overflowY: 'auto', '& .MuiListItemButton-root': { mb: 1 } }}>
        {nav.map((n) => (
          <ListItemButton
            key={n.path}
            selected={location.pathname.startsWith(n.path)}
            onClick={() => {
              setDrawerOpen(false)
              navigate(n.path)
            }}
          >
            <ListItemIcon>{n.icon}</ListItemIcon>
            <ListItemText primary={n.label} />
          </ListItemButton>
        ))}
      </List>
      <Divider sx={{ my: 2 }} />
      <List>
        <ListItemButton onClick={logout}>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="退出登录" />
        </ListItemButton>
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {!isDesktop && (
            <IconButton edge="start" onClick={() => setDrawerOpen(true)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 500 }}>
            {active?.label ?? ''}
          </Typography>
          <IconButton onClick={() => setPaletteOpen(true)} aria-label="主题调色盘">
            <PaletteIcon />
          </IconButton>
          <IconButton
            onClick={() => setMode(isDark ? 'light' : 'dark')}
            aria-label="切换明暗模式"
          >
            {isDark ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <PaletteDialog open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      <Drawer
        variant={isDesktop ? 'permanent' : 'temporary'}
        open={isDesktop ? true : drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          width: 240,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
            pt: 8,
            overflow: 'hidden',
            height: '100%',
          },
        }}
      >
        {navList}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, minWidth: 0 }}>
        <Outlet />
      </Box>
    </Box>
  )
}
