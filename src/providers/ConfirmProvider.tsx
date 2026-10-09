import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false))

interface PendingState {
  options: ConfirmOptions
  resolve: (value: boolean) => void
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingState | null>(null)

  const confirm = useCallback<ConfirmFn>(
    (options) => new Promise<boolean>((resolve) => setPending({ options, resolve })),
    [],
  )

  const close = useCallback(
    (value: boolean) => {
      pending?.resolve(value)
      setPending(null)
    },
    [pending],
  )

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={!!pending} onOpenChange={(open) => !open && close(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{pending?.options.title}</DialogTitle>
            {pending?.options.message && (
              <DialogDescription>{pending.options.message}</DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => close(false)}>
              {pending?.options.cancelText ?? '取消'}
            </Button>
            <Button
              variant={pending?.options.danger ? 'destructive' : 'default'}
              onClick={() => close(true)}
            >
              {pending?.options.confirmText ?? '确定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext)
}