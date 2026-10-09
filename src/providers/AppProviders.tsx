import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import type { ReactNode } from 'react'
import { queryClient } from '@/lib/query'
import { ThemeProvider } from './ThemeProvider'
import { ConfirmProvider } from './ConfirmProvider'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ConfirmProvider>
          {children}
          <Toaster position="top-center" richColors closeButton theme="system" />
        </ConfirmProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}