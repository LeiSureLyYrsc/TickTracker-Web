import { setAuth } from './auth'
import type { LoginResult } from './types'

/** 保存登录态并返回应跳转的路径。 */
export function applyLogin(data: LoginResult): string {
  if (data.role === 'admin') {
    setAuth(data.token, 'admin', data.user_name ?? 'admin')
    return '/admin/commissions'
  }
  setAuth(data.token, 'user', data.user_name, data.user_id)
  return '/user/commissions'
}