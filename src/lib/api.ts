export class ApiError extends Error {
  status: number
  detail: unknown

  constructor(status: number, detail: unknown) {
    super(errorMessage(detail, `请求失败（${status}）`))
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

export function errorMessage(detail: unknown, fallback = '操作失败'): string {
  if (typeof detail === 'string' && detail.trim()) return detail
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: unknown }
    if (first && typeof first === 'object' && first.msg) return String(first.msg)
  }
  return fallback
}

function token(): string | null {
  try {
    return localStorage.getItem('tt_token')
  } catch {
    return null
  }
}

let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const isForm = options.body instanceof FormData
  const headers: Record<string, string> = {}
  if (!isForm && options.body !== undefined) headers['Content-Type'] = 'application/json'
  const t = token()
  if (t) headers['Authorization'] = `Bearer ${t}`
  Object.assign(headers, (options.headers as Record<string, string> | undefined) ?? {})
  const res = await fetch(path, { ...options, headers })
  if (res.status === 401) onUnauthorized?.()
  return res
}

export async function Api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, options)
  if (res.status === 204) return undefined as T
  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  if (!res.ok) {
    const detail =
      data && typeof data === 'object' && 'detail' in data
        ? (data as { detail: unknown }).detail
        : data
    throw new ApiError(res.status, detail)
  }
  return data as T
}

export async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    return errorMessage((data as { detail?: unknown })?.detail, '操作失败')
  } catch {
    return '网络错误'
  }
}