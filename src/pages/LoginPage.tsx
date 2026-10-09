import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { KeyRound, ShieldCheck, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Api, errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { applyLogin } from '@/lib/login'
import { qk } from '@/lib/query'
import { autofillSupported, loginWithPasskey, webauthnSupported } from '@/lib/webauthn'
import type { AuthConfig, LoginResult } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Spinner } from '@/components/ui/spinner'

export default function LoginPage() {
  const navigate = useNavigate()
  const auth = useAuth()
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)

  const { data: config } = useQuery({
    queryKey: qk.authConfig,
    queryFn: () => fetch('/api/auth/config').then((r) => (r.ok ? r.json() : null)),
    staleTime: 5 * 60_000,
  }) as { data: AuthConfig | null | undefined }

  function go(data: LoginResult) {
    navigate(applyLogin(data), { replace: true })
  }

  async function accountLogin() {
    const acc = account.trim()
    if (!acc || !password) return toast.error('请输入账号和密码')
    setBusy(true)
    try {
      const data = await Api<LoginResult>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ account: acc, password }),
      })
      toast.success('登录成功')
      go(data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '登录失败')
    } finally {
      setBusy(false)
    }
  }

  async function codeLogin() {
    if (code.length !== 6) return toast.error('请输入 6 位验证码')
    setBusy(true)
    try {
      const data = await Api<LoginResult>('/api/auth/user/login', {
        method: 'POST',
        body: JSON.stringify({ code }),
      })
      toast.success('登录成功')
      go(data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '登录失败')
    } finally {
      setBusy(false)
    }
  }

  async function passkeyLogin() {
    setBusy(true)
    try {
      const data = await loginWithPasskey('')
      toast.success('登录成功')
      go(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (!/abort|cancel|NotAllowed/i.test(msg)) toast.error(msg || '通行密钥登录失败')
    } finally {
      setBusy(false)
    }
  }

  // 条件式自动填充（conditional UI）：页面加载即在账号输入框中等待用户选择通行密钥
  useEffect(() => {
    if (!config?.passkey_enabled || auth.role) return
    let cancelled = false
    ;(async () => {
      if (!webauthnSupported() || !(await autofillSupported())) return
      try {
        const data = await loginWithPasskey('', { conditional: true })
        if (cancelled) return
        toast.success('登录成功')
        go(data)
      } catch {
        /* 用户未选择或浏览器不支持：静默忽略 */
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.passkey_enabled, auth.role])

  if (auth.role === 'admin') return <Navigate to="/admin/commissions" replace />
  if (auth.role === 'user') return <Navigate to="/user/commissions" replace />

  const oidcProviders = config?.oidc_providers ?? []

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
            <Sparkles className="h-7 w-7" />
          </div>
          <CardTitle className="text-xl">代肝记录系统</CardTitle>
          <p className="text-sm text-muted-foreground">欢迎回来，请登录</p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="account">
            <TabsList>
              <TabsTrigger value="account">账号登录</TabsTrigger>
              <TabsTrigger value="code">验证码登录</TabsTrigger>
            </TabsList>

            <TabsContent value="account">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="account">用户名 / 邮箱</Label>
                  <Input
                    id="account"
                    autoComplete="username webauthn"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && accountLogin()}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password">密码</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && accountLogin()}
                  />
                </div>
                <Button onClick={accountLogin} disabled={busy} size="lg">
                  {busy ? <Spinner /> : '登 录'}
                </Button>

                {config?.passkey_enabled && (
                  <Button variant="tonal" onClick={passkeyLogin} disabled={busy}>
                    <KeyRound />
                    使用通行密钥登录
                  </Button>
                )}

                {config?.allow_forgot_password && (
                  <button
                    type="button"
                    className="mx-auto text-xs text-primary hover:underline"
                    onClick={() => setForgotOpen(true)}
                  >
                    忘记密码？
                  </button>
                )}
              </div>
            </TabsContent>

            <TabsContent value="code">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="code">6 位验证码</Label>
                  <Input
                    id="code"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && codeLogin()}
                  />
                </div>
                <Button onClick={codeLogin} disabled={busy} size="lg">
                  {busy ? <Spinner /> : '登 录'}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  向 Bot 发送 <code className="rounded bg-muted px-1">/代肝登录</code> 获取验证码（5 分钟有效）
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {oidcProviders.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                第三方登录
                <span className="h-px flex-1 bg-border" />
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {oidcProviders.map((p) => (
                  <Button
                    key={p.id}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.location.href = `/api/oidc/login/${encodeURIComponent(p.id)}`
                    }}
                  >
                    <ShieldCheck />
                    {p.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} />
    </div>
  )
}

function ForgotPasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [step, setStep] = useState<'send' | 'reset'>('send')
  const [account, setAccount] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function send() {
    if (!account.trim()) return toast.error('请输入账号')
    setBusy(true)
    try {
      await Api('/api/auth/forgot/send', {
        method: 'POST',
        body: JSON.stringify({ account: account.trim() }),
      })
      toast.success('若该账号绑定了已验证邮箱，重置验证码已发送')
      setStep('reset')
    } catch (e) {
      toast.error(errorMessage((e as { detail?: unknown })?.detail, '操作失败'))
    } finally {
      setBusy(false)
    }
  }

  async function reset() {
    if (newPassword.length < 6) return toast.error('新密码至少 6 位')
    setBusy(true)
    try {
      await Api('/api/auth/forgot/reset', {
        method: 'POST',
        body: JSON.stringify({ account: account.trim(), code: code.trim(), new_password: newPassword }),
      })
      toast.success('密码已重置，请使用新密码登录')
      onOpenChange(false)
      setStep('send')
      setAccount('')
      setCode('')
      setNewPassword('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '重置失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>忘记密码</DialogTitle>
          <DialogDescription>
            {step === 'send' ? '输入账号以接收邮箱验证码' : '输入验证码并设置新密码'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>用户名 / 邮箱</Label>
            <Input
              value={account}
              disabled={step === 'reset'}
              onChange={(e) => setAccount(e.target.value)}
            />
          </div>
          {step === 'reset' && (
            <>
              <Input placeholder="邮箱验证码" value={code} onChange={(e) => setCode(e.target.value)} />
              <Input
                type="password"
                placeholder="新密码（至少 6 位）"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          {step === 'send' ? (
            <Button onClick={send} disabled={busy}>
              {busy ? <Spinner /> : '发送验证码'}
            </Button>
          ) : (
            <Button onClick={reset} disabled={busy}>
              {busy ? <Spinner /> : '重置密码'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}