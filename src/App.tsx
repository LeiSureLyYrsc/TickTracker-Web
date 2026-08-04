import { useEffect, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import TableChartIcon from '@mui/icons-material/TableChart'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import MailIcon from '@mui/icons-material/Mail'
import GroupIcon from '@mui/icons-material/Group'
import SportsEsportsIcon from '@mui/icons-material/SportsEsports'
import SettingsIcon from '@mui/icons-material/Settings'
import HistoryIcon from '@mui/icons-material/History'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import ViewListIcon from '@mui/icons-material/ViewList'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import SendIcon from '@mui/icons-material/Send'
import AppLayout, { type NavItem } from './components/AppLayout'
import { ToastProvider } from './lib/toast'
import { ConfirmProvider } from './lib/confirm'
import { setUnauthorizedHandler } from './lib/api'
import { clearAuth, useAuth } from './lib/auth'
import Login from './pages/Login'
import Commissions from './pages/admin/Commissions'
import Progress from './pages/admin/Progress'
import Messages from './pages/admin/Messages'
import Users from './pages/admin/Users'
import Games from './pages/admin/Games'
import Settings from './pages/admin/Settings'
import AuditLogs from './pages/admin/AuditLogs'
import Reminders from './pages/admin/Reminders'
import MyCommissions from './pages/user/MyCommissions'
import MyProgress from './pages/user/MyProgress'
import SendMessage from './pages/user/SendMessage'
import Profile from './pages/Profile'
import OidcCallback from './pages/OidcCallback'
import OidcLinkCallback from './pages/OidcLinkCallback'

const adminNav: NavItem[] = [
  { path: '/admin/commissions', icon: <TableChartIcon />, label: '代肝数据' },
  { path: '/admin/progress', icon: <CheckCircleIcon />, label: '今日进度' },
  { path: '/admin/messages', icon: <MailIcon />, label: '留言管理' },
  { path: '/admin/users', icon: <GroupIcon />, label: '用户管理' },
  { path: '/admin/games', icon: <SportsEsportsIcon />, label: '游戏管理' },
  { path: '/admin/reminders', icon: <NotificationsActiveIcon />, label: '提醒管理' },
  { path: '/admin/audit', icon: <HistoryIcon />, label: '审计日志' },
  { path: '/admin/settings', icon: <SettingsIcon />, label: '系统设置' },
]

const userNav: NavItem[] = [
  { path: '/user/commissions', icon: <ViewListIcon />, label: '我的代肝' },
  { path: '/user/progress', icon: <TaskAltIcon />, label: '今日进度' },
  { path: '/user/messages', icon: <SendIcon />, label: '发送留言' },
]

function RequireAuth({ roles, children }: { roles: Array<'admin' | 'user'>; children: ReactNode }) {
  const auth = useAuth()
  if (!auth.role || !roles.includes(auth.role)) return <Navigate to="/" replace />
  return <>{children}</>
}

function UnauthorizedBootstrap() {
  const navigate = useNavigate()
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearAuth()
      navigate('/')
    })
  }, [navigate])
  return null
}

export default function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <BrowserRouter>
          <UnauthorizedBootstrap />
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/oidc/callback" element={<OidcCallback />} />
            <Route path="/oidc/link-callback" element={<OidcLinkCallback />} />
            <Route
              path="/admin"
              element={
                <RequireAuth roles={['admin']}>
                  <AppLayout nav={adminNav} />
                </RequireAuth>
              }
            >
              <Route index element={<Navigate to="commissions" replace />} />
              <Route path="commissions" element={<Commissions />} />
              <Route path="progress" element={<Progress />} />
              <Route path="messages" element={<Messages />} />
              <Route path="users" element={<Users />} />
              <Route path="games" element={<Games />} />
              <Route path="reminders" element={<Reminders />} />
              <Route path="audit" element={<AuditLogs />} />
              <Route path="settings" element={<Settings />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            <Route
              path="/user"
              element={
                <RequireAuth roles={['user', 'admin']}>
                  <AppLayout nav={userNav} />
                </RequireAuth>
              }
            >
              <Route index element={<Navigate to="commissions" replace />} />
              <Route path="commissions" element={<MyCommissions />} />
              <Route path="progress" element={<MyProgress />} />
              <Route path="messages" element={<SendMessage />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ConfirmProvider>
    </ToastProvider>
  )
}
