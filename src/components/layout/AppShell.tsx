import { useState, type ReactNode } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu, Shield, UserRound } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { ThemeMenu } from '@/components/common/ThemeMenu'
import { clearAuth, useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

export interface NavItem {
  path: string
  label: string
  icon: ReactNode
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: NavItem
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors',
        active
          ? 'bg-secondary text-secondary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      <span className="[&_svg]:size-5">{item.icon}</span>
      {item.label}
    </button>
  )
}

export function AppShell({ nav }: { nav: NavItem[] }) {
  const location = useLocation()
  const navigate = useNavigate()
  const auth = useAuth()
  const [sheetOpen, setSheetOpen] = useState(false)

  const isAdmin = auth.role === 'admin'
  const inAdmin = location.pathname.startsWith('/admin')
  const profilePath = inAdmin ? '/admin/profile' : '/user/profile'
  const active = nav.find((n) => location.pathname.startsWith(n.path)) ?? nav[0]
  const bottom = nav.slice(0, 4)
  const overflow = nav.slice(4)

  function go(path: string) {
    setSheetOpen(false)
    navigate(path)
  }
  function logout() {
    clearAuth()
    navigate('/')
  }

  const accountMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="账户">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{(auth.userName ?? '?').charAt(0)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{auth.userName ?? '账户'}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isAdmin && (
          <DropdownMenuItem onClick={() => go(inAdmin ? '/user/commissions' : '/admin/commissions')}>
            {inAdmin ? <UserRound /> : <Shield />}
            {inAdmin ? '用户门户' : '管理员门户'}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => go(profilePath)}>
          <UserRound />
          个人设置
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSheetOpen(true)}
            aria-label="打开菜单"
          >
            <Menu />
          </Button>
          <span className="truncate text-base font-semibold sm:text-lg">{active?.label ?? ''}</span>
          <div className="ml-auto flex items-center gap-1">
            <ThemeMenu />
            {accountMenu}
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl">
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border p-3 md:flex">
          <div className="px-4 py-3 text-lg font-bold text-primary">代肝记录</div>
          <nav className="flex flex-1 flex-col gap-1">
            {nav.map((n) => (
              <NavButton
                key={n.path}
                item={n}
                active={location.pathname.startsWith(n.path)}
                onClick={() => go(n.path)}
              />
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-3 pb-24 pt-4 sm:px-5 md:pb-8">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-lg items-stretch">
          {bottom.map((n) => {
            const isActive = location.pathname.startsWith(n.path)
            return (
              <button
                key={n.path}
                type="button"
                onClick={() => go(n.path)}
                className={cn(
                  'flex flex-1 flex-col items-center gap-0.5 py-2 pb-safe text-[11px]',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <span className="[&_svg]:size-5">{n.icon}</span>
                <span className="truncate">{n.label}</span>
              </button>
            )
          })}
          {overflow.length > 0 && (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="flex flex-1 flex-col items-center gap-0.5 py-2 pb-safe text-[11px] text-muted-foreground"
            >
              <Menu className="h-5 w-5" />
              <span>更多</span>
            </button>
          )}
        </div>
      </nav>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left">
          <SheetTitle>导航</SheetTitle>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {nav.map((n) => (
              <NavButton
                key={n.path}
                item={n}
                active={location.pathname.startsWith(n.path)}
                onClick={() => go(n.path)}
              />
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  )
}