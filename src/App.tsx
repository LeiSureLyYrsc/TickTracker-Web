import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/components/layout/RequireAuth'
import { adminNav, userNav } from '@/nav'
import { setUnauthorizedHandler } from '@/lib/api'
import { clearAuth } from '@/lib/auth'
import { Spinner } from '@/components/ui/spinner'
import LoginPage from '@/pages/LoginPage'

const OidcCallbackPage = lazy(() => import('@/pages/OidcCallbackPage'))
const OidcLinkCallbackPage = lazy(() => import('@/pages/OidcLinkCallbackPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const AdminCommissionsPage = lazy(() => import('@/pages/admin/AdminCommissionsPage'))
const AdminProgressPage = lazy(() => import('@/pages/admin/AdminProgressPage'))
const AdminMessagesPage = lazy(() => import('@/pages/admin/AdminMessagesPage'))
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'))
const AdminGamesPage = lazy(() => import('@/pages/admin/AdminGamesPage'))
const AdminRemindersPage = lazy(() => import('@/pages/admin/AdminRemindersPage'))
const AdminAuditPage = lazy(() => import('@/pages/admin/AdminAuditPage'))
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage'))
const MyCommissionsPage = lazy(() => import('@/pages/user/MyCommissionsPage'))
const MyProgressPage = lazy(() => import('@/pages/user/MyProgressPage'))
const SendMessagePage = lazy(() => import('@/pages/user/SendMessagePage'))

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner className="h-6 w-6 text-muted-foreground" />
    </div>
  )
}

function UnauthorizedBootstrap() {
  const navigate = useNavigate()
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearAuth()
      navigate('/')
    })
    return () => setUnauthorizedHandler(null)
  }, [navigate])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <UnauthorizedBootstrap />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/oidc/callback" element={<OidcCallbackPage />} />
          <Route path="/oidc/link-callback" element={<OidcLinkCallbackPage />} />

          <Route
            path="/admin"
            element={
              <RequireAuth roles={['admin']}>
                <AppShell nav={adminNav} />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="commissions" replace />} />
            <Route path="commissions" element={<AdminCommissionsPage />} />
            <Route path="progress" element={<AdminProgressPage />} />
            <Route path="messages" element={<AdminMessagesPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="games" element={<AdminGamesPage />} />
            <Route path="reminders" element={<AdminRemindersPage />} />
            <Route path="audit" element={<AdminAuditPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          <Route
            path="/user"
            element={
              <RequireAuth roles={['user', 'admin']}>
                <AppShell nav={userNav} />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="commissions" replace />} />
            <Route path="commissions" element={<MyCommissionsPage />} />
            <Route path="progress" element={<MyProgressPage />} />
            <Route path="messages" element={<SendMessagePage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}