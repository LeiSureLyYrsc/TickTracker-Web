import { useSyncExternalStore } from 'react'
import type { Role } from './types'

const TOKEN_KEY = 'tt_token'
const ROLE_KEY = 'tt_role'
const NAME_KEY = 'tt_user_name'
const ID_KEY = 'tt_user_id'

export interface AuthState {
  token: string | null
  role: Role | null
  userName: string | null
  userId: number | null
}

function readRole(): Role | null {
  const r = localStorage.getItem(ROLE_KEY)
  return r === 'admin' || r === 'user' ? r : null
}

function read(): AuthState {
  const id = localStorage.getItem(ID_KEY)
  return {
    token: localStorage.getItem(TOKEN_KEY),
    role: readRole(),
    userName: localStorage.getItem(NAME_KEY),
    userId: id ? Number(id) : null,
  }
}

let auth: AuthState = read()
const listeners = new Set<() => void>()

function emit() {
  for (const fn of listeners) fn()
}

function persist(next: AuthState) {
  auth = next
  setOrRemove(TOKEN_KEY, next.token)
  setOrRemove(ROLE_KEY, next.role)
  setOrRemove(NAME_KEY, next.userName)
  setOrRemove(ID_KEY, next.userId === null ? null : String(next.userId))
  emit()
}

function setOrRemove(key: string, value: string | null) {
  if (value === null || value === '') localStorage.removeItem(key)
  else localStorage.setItem(key, value)
}

export function getAuth(): AuthState {
  return auth
}

export function setAuth(
  token: string,
  role: Role,
  userName?: string | null,
  userId?: number | null,
): void {
  persist({
    token,
    role,
    userName: userName ?? auth.userName,
    userId: userId ?? auth.userId,
  })
}

export function clearAuth(): void {
  persist({ token: null, role: null, userName: null, userId: null })
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, getAuth, getAuth)
}
