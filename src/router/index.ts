import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { Role } from '@/lib/types'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'login', component: () => import('@/pages/LoginPage.vue') },
  { path: '/oidc/callback', component: () => import('@/pages/OidcCallbackPage.vue') },
  { path: '/oidc/link-callback', component: () => import('@/pages/OidcLinkCallbackPage.vue') },
  {
    path: '/admin',
    component: () => import('@/components/layout/AppShell.vue'),
    props: { nav: 'admin' },
    meta: { roles: ['admin'] satisfies Role[] },
    children: [
      { path: '', redirect: '/admin/commissions' },
      { path: 'commissions', component: () => import('@/pages/admin/AdminCommissionsPage.vue') },
      { path: 'progress', component: () => import('@/pages/admin/AdminProgressPage.vue') },
      { path: 'messages', component: () => import('@/pages/admin/AdminMessagesPage.vue') },
      { path: 'users', component: () => import('@/pages/admin/AdminUsersPage.vue') },
      { path: 'games', component: () => import('@/pages/admin/AdminGamesPage.vue') },
      { path: 'reminders', component: () => import('@/pages/admin/AdminRemindersPage.vue') },
      { path: 'audit', component: () => import('@/pages/admin/AdminAuditPage.vue') },
      { path: 'settings', component: () => import('@/pages/admin/AdminSettingsPage.vue') },
      { path: 'profile', component: () => import('@/pages/ProfilePage.vue') },
    ],
  },
  {
    path: '/user',
    component: () => import('@/components/layout/AppShell.vue'),
    props: { nav: 'user' },
    meta: { roles: ['user', 'admin'] satisfies Role[] },
    children: [
      { path: '', redirect: '/user/commissions' },
      { path: 'commissions', component: () => import('@/pages/user/MyCommissionsPage.vue') },
      { path: 'progress', component: () => import('@/pages/user/MyProgressPage.vue') },
      { path: 'messages', component: () => import('@/pages/user/SendMessagePage.vue') },
      { path: 'profile', component: () => import('@/pages/ProfilePage.vue') },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  const roles = to.meta.roles as Role[] | undefined
  if (roles && (!auth.role || !roles.includes(auth.role))) return { path: '/' }
  return true
})

export default router