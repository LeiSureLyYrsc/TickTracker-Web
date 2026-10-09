import { Check, Monitor, Moon, Palette, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/providers/ThemeProvider'
import type { ThemeMode } from '@/lib/theme'

const SEEDS = ['#98D8A8', '#6750A4', '#0B57D0', '#B3261E', '#7D5260', '#386A20', '#F59E0B']

const modeLabel: Record<ThemeMode, string> = { light: '亮色', dark: '暗色', system: '跟随系统' }

export function ThemeMenu() {
  const { mode, setMode, seed, setSeed } = useTheme()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="主题设置">
          <Palette />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>外观</DropdownMenuLabel>
        {(['light', 'dark', 'system'] as const).map((m) => (
          <DropdownMenuItem key={m} onClick={() => setMode(m)}>
            {m === 'light' ? <Sun /> : m === 'dark' ? <Moon /> : <Monitor />}
            <span>{modeLabel[m]}</span>
            {mode === m && <Check className="ml-auto" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>主题色</DropdownMenuLabel>
        <div className="flex flex-wrap gap-2 px-3 py-2">
          {SEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSeed(s)}
              aria-label={`主题色 ${s}`}
              className="h-6 w-6 rounded-full border border-border"
              style={{ backgroundColor: s }}
            />
          ))}
        </div>
        <div className="px-3 pb-2">
          <input
            type="color"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            aria-label="自定义主题色"
            className="h-8 w-full cursor-pointer rounded-md border border-border bg-transparent"
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}