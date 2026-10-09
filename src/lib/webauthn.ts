import {
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser'
import { apiFetch } from './api'
import type { LoginResult } from './types'

async function detail(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { detail?: string }
    return data?.detail || fallback
  } catch {
    return fallback
  }
}

export function webauthnSupported(): boolean {
  return browserSupportsWebAuthn()
}

export async function autofillSupported(): Promise<boolean> {
  try {
    return await browserSupportsWebAuthnAutofill()
  } catch {
    return false
  }
}

export async function loginWithPasskey(
  account = '',
  opts: { conditional?: boolean } = {},
): Promise<LoginResult> {
  const optRes = await apiFetch('/api/passkey/login/options', {
    method: 'POST',
    body: JSON.stringify({ account }),
  })
  if (!optRes.ok) throw new Error(await detail(optRes, '获取认证选项失败'))
  const optData = (await optRes.json()) as { options: PublicKeyCredentialRequestOptionsJSON }

  const credential = await startAuthentication({
    optionsJSON: optData.options,
    useBrowserAutofill: opts.conditional === true,
  })

  const res = await apiFetch('/api/passkey/login/verify', {
    method: 'POST',
    body: JSON.stringify({ account, credential }),
  })
  if (!res.ok) throw new Error(await detail(res, '通行密钥登录失败'))
  return (await res.json()) as LoginResult
}

export async function registerPasskey(): Promise<void> {
  const optRes = await apiFetch('/api/passkey/register/options', { method: 'POST' })
  if (!optRes.ok) throw new Error(await detail(optRes, '获取注册选项失败'))
  const { options } = (await optRes.json()) as {
    options: PublicKeyCredentialCreationOptionsJSON
  }
  const credential = await startRegistration({ optionsJSON: options })
  const res = await apiFetch('/api/passkey/register/verify', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  })
  if (!res.ok) throw new Error(await detail(res, '通行密钥注册失败'))
}