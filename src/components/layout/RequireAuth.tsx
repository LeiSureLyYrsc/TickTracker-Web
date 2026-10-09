import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '@/lib/auth'
import type { Role } from '@/lib/types'

export function RequireAuth({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const auth = useAuth()
  if (!auth.role || !roles.includes(auth.role)) return <Navigate to="/" replace />
  return <>{children}</>
}