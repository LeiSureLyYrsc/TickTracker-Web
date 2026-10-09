import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

export default function OidcLinkCallbackPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  useEffect(() => {
    if (params.get('ok')) toast.success('已绑定第三方账号')
    else toast.error(params.get('error') || '绑定失败')
    const t = setTimeout(() => navigate(-1), 1200)
    return () => clearTimeout(t)
  }, [params, navigate])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
      正在返回…
    </div>
  )
}