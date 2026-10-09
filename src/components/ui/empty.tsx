import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Empty({ title, hint, icon, className }: { title: string; hint?: string; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-12 text-center', className)}>
      {icon && <div className="text-muted-foreground/60">{icon}</div>}
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {hint && <p className="text-xs text-muted-foreground/70">{hint}</p>}
    </div>
  )
}