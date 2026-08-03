import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import Snackbar from '@mui/material/Snackbar'
import Alert, { type AlertColor } from '@mui/material/Alert'

interface ToastItem {
  id: number
  message: string
  type: AlertColor
}

type ShowToast = (message: string, type?: AlertColor) => void

const ToastContext = createContext<ShowToast>(() => {})

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Record<number, number>>({})

  const remove = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
    window.clearTimeout(timers.current[id])
    delete timers.current[id]
  }, [])

  const show = useCallback<ShowToast>(
    (message, type = 'info') => {
      const id = nextId++
      setToasts((list) => [...list, { id, message, type }])
      timers.current[id] = window.setTimeout(() => remove(id), 4000)
    },
    [remove],
  )

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toasts.map((t) => (
        <Snackbar
          key={t.id}
          open
          autoHideDuration={4000}
          onClose={() => remove(t.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert variant="filled" severity={t.type} onClose={() => remove(t.id)} sx={{ width: '100%' }}>
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
