import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'

export interface ConfirmOptions {
  title?: string
  message?: string
  confirmText?: string
  danger?: boolean
}

type ConfirmFn = (options?: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn>(async () => false)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions>({})
  const resolver = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((opts = {}) => {
    setOptions(opts)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = useCallback((value: boolean) => {
    setOpen(false)
    resolver.current?.(value)
    resolver.current = null
  }, [])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={open} onClose={() => close(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{options.title ?? '确认操作'}</DialogTitle>
        <DialogContent>
          <DialogContentText style={{ whiteSpace: 'pre-wrap' }}>
            {options.message ?? '确定继续吗？'}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => close(false)}>取消</Button>
          <Button
            variant="contained"
            color={options.danger ? 'error' : 'primary'}
            onClick={() => close(true)}
          >
            {options.confirmText ?? '确认'}
          </Button>
        </DialogActions>
      </Dialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext)
}
