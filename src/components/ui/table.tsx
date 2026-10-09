import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function TableWrapper({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('w-full overflow-x-auto', className)} {...props} />
}

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
}

export function TableHeader({ className, ...props }: ComponentProps<'thead'>) {
  return <thead className={cn('[&_tr]:border-b', className)} {...props} />
}

export function TableBody({ className, ...props }: ComponentProps<'tbody'>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

export function TableRow({ className, ...props }: ComponentProps<'tr'>) {
  return <tr className={cn('border-b border-border transition-colors hover:bg-muted/50', className)} {...props} />
}

export function TableHead({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      className={cn('h-10 whitespace-nowrap px-3 text-left align-middle text-xs font-medium text-muted-foreground', className)}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: ComponentProps<'td'>) {
  return <td className={cn('whitespace-nowrap px-3 py-2.5 align-middle', className)} {...props} />
}