import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BellRing, KeyRound, Link2, Mail, Trash2, Upload, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Api, apiFetch, readError } from '@/lib/api'
import { qk } from '@/lib/query'
import { registerPasskey } from '@/lib/webauthn'
import { formatDate } from '@/lib/utils'
import type { MyReminder, PasskeyItem, Profile, SsoBinding } from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'

interface Provider {
  id: string
  name: string
  icon: string
  icon_url?: string | null
}

export default function ProfilePage() {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: profile, isLoading } = useQuery({
    queryKey: qk.profile,
    queryFn: () => Api<Profile>('/api/me/profile'),
  })

  const { data: passkeys = [] } = useQuery({
    queryKey: qk.passkeys,
    queryFn: () => Api<PasskeyItem[]>('/api/passkey/credentials'),
    enabled: !!profile?.passkey_enabled,
  })

  const { data: reminder } = useQuery({
    queryKey: qk.user.reminder,
    queryFn: () => Api<MyReminder>('/api/user/me/reminder'),
    enabled: profile?.role === 'user',
  })

  const { data: providers = [] } = useQuery({
    queryKey: ['oidc', 'providers'],
    queryFn: () => fetch('/api/oidc/providers').then((r) => (r.ok ? r.json() : [])),
    enabled: !!profile?.oidc_enabled,
  }) as { data: Provider[] }

  const { data: bindings = [] } = useQuery({
    queryKey: qk.oidcBindings,
    queryFn: () => Api<SsoBinding[]>('/api/oidc/my-bindings'),
    enabled: !!profile?.oidc_enabled,
  })

  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [bindEmail, setBindEmail] = useState('')
  const [bindCode, setBindCode] = useState('')
  const [bindSent, setBindSent] = useState(false)
  const [time, setTime] = useState('22:00')

  useEffect(() => {
    if (reminder) setTime(reminder.push_time)
  }, [reminder])

  const invalidateProfile = () => qc.invalidateQueries({ queryKey: qk.profile })

  const changePw = useMutation({
    mutationFn: () =>
      Api('/api/me/password', {
        method: 'POST',
        body: JSON.stringify({ old_password: oldPw, new_password: newPw }),
      }),
    onSuccess: () => {
      toast.success('密码已更新')
      setOldPw('')
      setNewPw('')
      setConfirmPw('')
      invalidateProfile()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '修改失败'),
  })

  const saveReminder = useMutation({
    mutationFn: (patch: { enabled?: boolean; push_time?: string }) =>
      Api<MyReminder>('/api/user/me/reminder', {
        method: 'PUT',
        body: JSON.stringify(patch),
      }),
    onSuccess: (data) => {
      toast.success(data.enabled ? '提醒已启用' : '提醒已关闭')
      qc.setQueryData(qk.user.reminder, data)
      setTime(data.push_time)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '保存失败'),
  })

  const addPasskeyMut = useMutation({
    mutationFn: registerPasskey,
    onSuccess: () => {
      toast.success('通行密钥已添加')
      qc.invalidateQueries({ queryKey: qk.passkeys })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '添加失败'),
  })

  async function deletePasskey(id: number) {
    try {
      await Api(`/api/passkey/credentials/${id}`, { method: 'DELETE' })
      toast.success('通行密钥已删除')
      qc.invalidateQueries({ queryKey: qk.passkeys })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    }
  }

  async function uploadAvatar(file: File) {
    const form = new FormData()
    form.append('file', file)
    const res = await apiFetch('/api/me/avatar', { method: 'POST', body: form })
    if (res.ok) {
      toast.success('头像已更新')
      invalidateProfile()
    } else {
      toast.error(await readError(res))
    }
  }

  async function removeAvatar() {
    const res = await apiFetch('/api/me/avatar', { method: 'DELETE' })
    if (res.ok) {
      toast.success('头像已删除')
      invalidateProfile()
    } else {
      toast.error(await readError(res))
    }
  }

  async function sendBindCode() {
    if (!bindEmail.includes('@')) return toast.error('请输入有效邮箱')
    try {
      await Api('/api/me/email/bind', {
        method: 'POST',
        body: JSON.stringify({ email: bindEmail.trim() }),
      })
      setBindSent(true)
      toast.success('验证码已发送')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '发送失败')
    }
  }

  async function verifyBind() {
    try {
      await Api('/api/me/email/verify', {
        method: 'POST',
        body: JSON.stringify({ email: bindEmail.trim(), code: bindCode.trim() }),
      })
      toast.success('邮箱绑定成功')
      setBindEmail('')
      setBindCode('')
      setBindSent(false)
      invalidateProfile()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '验证失败')
    }
  }

  async function linkSso(id: string) {
    try {
      const data = await Api<{ url: string }>(`/api/oidc/link/start/${id}`, { method: 'POST' })
      window.location.href = data.url
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '绑定失败')
    }
  }

  async function unlinkSso(id: string) {
    try {
      await Api(`/api/oidc/bindings/${id}`, { method: 'DELETE' })
      toast.success('已解绑')
      qc.invalidateQueries({ queryKey: qk.oidcBindings })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '解绑失败')
    }
  }

  if (isLoading || !profile) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  const avatarSrc = profile.avatar_url ?? undefined

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-primary" />
            账户信息
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {avatarSrc && <AvatarImage src={avatarSrc} alt={profile.name} />}
            <AvatarFallback className="text-xl">{profile.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-lg font-semibold">{profile.name}</span>
              <Badge variant={profile.role === 'admin' ? 'default' : 'muted'}>
                {profile.role === 'admin' ? '管理员' : '用户'}
              </Badge>
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {profile.role === 'user' && `ID ${profile.user_id ?? '-'} · QQ ${profile.qq_id ?? '未绑定'}`}
              {profile.email && ` · ${profile.email}${profile.email_verified ? '（已验证）' : '（未验证）'}`}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>头像设置</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Avatar className="h-20 w-20">
            {avatarSrc && <AvatarImage src={avatarSrc} alt={profile.name} />}
            <AvatarFallback className="text-2xl">{profile.name.charAt(0)}</AvatarFallback>
          </Avatar>
          {profile.avatar_upload_allowed && (
            <Button variant="tonal" onClick={() => fileRef.current?.click()}>
              <Upload />
              上传头像
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) uploadAvatar(f)
              e.target.value = ''
            }}
          />
          {profile.has_avatar && (
            <Button variant="outline" onClick={removeAvatar}>
              <Trash2 />
              删除头像
            </Button>
          )}
        </CardContent>
      </Card>

      {profile.allow_email_binding && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              邮箱绑定
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profile.email ? (
              <div className="flex items-center gap-2">
                <span>{profile.email}</span>
                <Badge variant={profile.email_verified ? 'success' : 'muted'}>
                  {profile.email_verified ? '已验证' : '未验证'}
                </Badge>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Label>邮箱地址</Label>
                    <Input value={bindEmail} onChange={(e) => setBindEmail(e.target.value)} />
                  </div>
                  <Button variant="tonal" onClick={sendBindCode} disabled={bindSent}>
                    {bindSent ? '已发送' : '发送验证码'}
                  </Button>
                </div>
                {bindSent && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <Label>邮箱验证码</Label>
                      <Input value={bindCode} onChange={(e) => setBindCode(e.target.value)} />
                    </div>
                    <Button onClick={verifyBind}>验证并绑定</Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {profile.oidc_enabled && providers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              SSO 绑定
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {providers.map((p) => {
              const bound = bindings.find((b) => b.provider_id === p.id)
              return (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    {bound?.email && <p className="truncate text-xs text-muted-foreground">{bound.email}</p>}
                  </div>
                  {bound ? (
                    <Button variant="outline" size="sm" onClick={() => unlinkSso(p.id)}>
                      解绑
                    </Button>
                  ) : (
                    <Button variant="tonal" size="sm" onClick={() => linkSso(p.id)}>
                      绑定
                    </Button>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {profile.role === 'user' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-primary" />
              定时提醒
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <label className="flex items-center justify-between gap-2">
              <span className="text-sm">启用每日代肝提醒</span>
              <Switch
                checked={!!reminder?.enabled}
                onCheckedChange={(v) => saveReminder.mutate({ enabled: v })}
              />
            </label>
            <div className="flex items-end gap-2">
              <div className="w-32">
                <Label>推送时间</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              <Button
                variant="tonal"
                onClick={() => saveReminder.mutate({ push_time: time })}
                disabled={!reminder?.enabled || saveReminder.isPending}
              >
                保存时间
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {reminder?.enabled
                ? `已启用 · 每天 ${reminder.push_time} 推送`
                : '启用后每天按时推送今日代肝状态（需已绑定 QQ 且有待办记录）'}
            </p>
          </CardContent>
        </Card>
      )}

      {profile.passkey_enabled && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              通行密钥
            </CardTitle>
            <Button size="sm" variant="tonal" onClick={() => addPasskeyMut.mutate()} disabled={addPasskeyMut.isPending}>
              {addPasskeyMut.isPending ? <Spinner /> : '添加'}
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {passkeys.length === 0 ? (
              <p className="text-sm text-muted-foreground">尚未添加通行密钥</p>
            ) : (
              passkeys.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm">
                    通行密钥 · {p.credential_id}
                    {p.created_at ? ` · ${formatDate(p.created_at)}` : ''}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => deletePasskey(p.id)}>
                    删除
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{profile.password_set ? '修改密码' : '设置密码'}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {profile.password_set && (
            <div>
              <Label>原密码</Label>
              <Input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} />
            </div>
          )}
          <div>
            <Label>新密码（至少 6 位）</Label>
            <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          </div>
          <div>
            <Label>确认新密码</Label>
            <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
          </div>
          <Button
            className="self-start"
            onClick={() => {
              if (newPw.length < 6) return toast.error('新密码至少 6 位')
              if (newPw !== confirmPw) return toast.error('两次输入不一致')
              if (profile.password_set && !oldPw) return toast.error('请输入原密码')
              changePw.mutate()
            }}
            disabled={changePw.isPending}
          >
            {changePw.isPending ? <Spinner /> : '保存'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}