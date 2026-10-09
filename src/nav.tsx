import {
  Bell,
  CheckCircle2,
  Gamepad2,
  History,
  ListChecks,
  Mail,
  Send,
  Settings,
  Table2,
  Users,
} from 'lucide-react'
import type { NavItem } from '@/components/layout/AppShell'

export const adminNav: NavItem[] = [
  { path: '/admin/commissions', label: '代肝数据', icon: <Table2 /> },
  { path: '/admin/progress', label: '今日进度', icon: <CheckCircle2 /> },
  { path: '/admin/messages', label: '留言', icon: <Mail /> },
  { path: '/admin/users', label: '用户', icon: <Users /> },
  { path: '/admin/games', label: '游戏', icon: <Gamepad2 /> },
  { path: '/admin/reminders', label: '提醒', icon: <Bell /> },
  { path: '/admin/audit', label: '审计', icon: <History /> },
  { path: '/admin/settings', label: '设置', icon: <Settings /> },
]

export const userNav: NavItem[] = [
  { path: '/user/commissions', label: '我的代肝', icon: <ListChecks /> },
  { path: '/user/progress', label: '今日进度', icon: <CheckCircle2 /> },
  { path: '/user/messages', label: '留言', icon: <Send /> },
]