import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetClose = DialogPrimitive.Close

type Side = 'left' | 'right' | 'top' | 'bottom'

const sideClasses: Record<Side, string> = {
  left: 'left-0 top-0 h-full w-72 border-r data-[state=open]:translate-x-0',
  right: 'right-0 top-0 h-full w-72 border-l',
  top: 'top-0 left-0 w-full border-b',
  bottom: 'bottom-0 left-0 w-full border-t',
}

export function SheetContent({
  className,
  children,
  side = 'left',
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { side?: Side }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-50 flex flex-col gap-4 border-border bg-background p-4 shadow-xl',
          sideClasses[side],
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-accent">
          <X className="h-4 w-4" />
          <span className="sr-only">关闭</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function SheetTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-sm font-semibold text-muted-foreground', className)}
      {...props}
    />
  )
}