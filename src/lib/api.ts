import { getAuth } from './auth'

let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const isForm = options.body instanceof FormData
  const headers: Record<string, string> = {}
  if (!isForm) headers['Content-Type'] = 'application/json'
  const auth = getAuth()
  if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`
  const extra = (options.headers as Record<string, string> | undefined) ?? {}
  Object.assign(headers, extra)
  const res = await fetch(path, { ...options, headers })
  if (res.status === 401) onUnauthorized?.()
  return res
}

export async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    return data.detail || '操作失败'
  } catch {
    return '网络错误'
  }
}
