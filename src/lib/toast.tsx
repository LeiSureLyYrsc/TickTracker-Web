import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import Snackbar from '@mui/material/Snackbar'
import Alert, { type AlertColor } from '@mui/material/Alert'

interface ToastItem {
  id: number
  message: string
  type: AlertColor
  duration: number
  open: boolean
}

type ShowToast = (message: string, type?: AlertColor, duration?: number) => void

const ToastContext = createContext<ShowToast>(() => {})

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const remove = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, open: false } : t)))
  }, [])

  const show = useCallback<ShowToast>(
    (message, type = 'info', duration = 4000) => {
      const id = nextId++
      setToasts((list) => [...list, { id, message, type, duration, open: true }])
    },
    [],
  )

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toasts.map((t) => (
        <Snackbar
          key={t.id}
          open={t.open}
          autoHideDuration={t.duration}
          onClose={() => dismiss(t.id)}
          slotProps={{
            transition: {
              onExited: () => remove(t.id),
            },
          }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            variant="filled"
            severity={t.type}
            onClose={() => dismiss(t.id)}
            sx={{ width: '100%' }}
          >
            {t.message}
          </Alert>
        </Snackbar>
      ))}
    </ToastContext.Provider>
  )
}

export function useToast(): ShowToast {
  return useContext(ToastContext)
}
