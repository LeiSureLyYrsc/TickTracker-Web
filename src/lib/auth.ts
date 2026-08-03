import { useSyncExternalStore } from 'react'

const TOKEN_KEY = 'ct_token'
const ROLE_KEY = 'ct_role'
const NAME_KEY = 'ct_user_name'
const ID_KEY = 'ct_user_id'

export interface AuthState {
  token: string | null
  role: 'admin' | 'user' | null
  userName: string | null
  userId: number | null
}

function readRole(): 'admin' | 'user' | null {
  const r = localStorage.getItem(ROLE_KEY)
  return r === 'admin' || r === 'user' ? r : null
}

function read(): AuthState {
  return {
    token: localStorage.getItem(TOKEN_KEY),
    role: readRole(),
    userName: localStorage.getItem(NAME_KEY),
    userId: localStorage.getItem(ID_KEY) ? Number(localStorage.getItem(ID_KEY)) : null,
  }
}

let auth: AuthState = read()
const listeners = new Set<() => void>()

function emit() {
  for (const fn of listeners) fn()
}

function persist(next: AuthState) {
  auth = next
  if (next.token) localStorage.setItem(TOKEN_KEY, next.token)
  else localStorage.removeItem(TOKEN_KEY)
  if (next.role) localStorage.setItem(ROLE_KEY, next.role)
  else localStorage.removeItem(ROLE_KEY)
  if (next.userName) localStorage.setItem(NAME_KEY, next.userName)
  else localStorage.removeItem(NAME_KEY)
  if (next.userId !== null && next.userId !== undefined) localStorage.setItem(ID_KEY, String(next.userId))
  else localStorage.removeItem(ID_KEY)
  emit()
}

export function getAuth(): AuthState {
  return auth
}

export function setAuth(
  token: string,
  role: 'admin' | 'user',
  userName?: string,
  userId?: number,
) {
  persist({
    token,
    role,
    userName: userName ?? auth.userName,
    userId: userId !== undefined ? userId : auth.userId,
  })
}

export function clearAuth() {
  persist({ token: null, role: null, userName: null, userId: null })
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, getAuth, getAuth)
}
