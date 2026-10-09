import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Api } from '@/lib/api'
import { applyLogin } from '@/lib/login'
import type { LoginResult } from '@/lib/types'
import { Spinner } from '@/components/ui/spinner'

export default function OidcCallbackPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    const code = params.get('code')
    if (!code) {
      setError('缺少会话码')
      return
    }
    Api<LoginResult>('/api/oidc/consume', {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
      .then((data) => navigate(applyLogin(data), { replace: true }))
      .catch((e) => setError(e instanceof Error ? e.message : '登录失败'))
  }, [params, navigate])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background">
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <>
          <Spinner className="h-6 w-6" />
          <p className="text-sm text-muted-foreground">正在登录…</p>
        </>
      )}
    </div>
  )
}