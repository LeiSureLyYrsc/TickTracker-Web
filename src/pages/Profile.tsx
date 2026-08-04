import { useCallback, useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import FormControlLabel from '@mui/material/FormControlLabel'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import LockResetIcon from '@mui/icons-material/LockReset'
import EmailIcon from '@mui/icons-material/Email'
import KeyIcon from '@mui/icons-material/Key'
import LinkIcon from '@mui/icons-material/Link'
import LinkOffIcon from '@mui/icons-material/LinkOff'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import { startRegistration } from '@simplewebauthn/browser'
import { apiFetch, readError } from '../lib/api'
import { useToast } from '../lib/toast'
import OidcIcon from '../lib/oidcIcons'

interface ProfileData {
  role: 'admin' | 'user'
  name: string
  user_id: number | null
  qq_id: number | null
  email: string | null
  email_verified: boolean
  has_avatar: boolean
  avatar_url: string | null
  password_set: boolean
  avatar_upload_allowed: boolean
  allow_email_binding: boolean
  passkey_enabled: boolean
  oidc_enabled: boolean
}

interface PasskeyItem {
  id: number
  credential_id: string
  created_at: string | null
}

interface SsoProvider {
  id: string
  name: string
  icon: string
  icon_url?: string
}

interface SsoBinding {
  provider_id: string
  provider_name: string
  icon: string
  icon_url?: string
  email: string | null
}

interface MyReminder {
  enabled: boolean
  push_time: string
  last_sent_date: string | null
}

export default function Profile() {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(false)
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [bindEmail, setBindEmail] = useState('')
  const [bindCode, setBindCode] = useState('')
  const [bindSent, setBindSent] = useState(false)
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([])
  const [ssoProviders, setSsoProviders] = useState<SsoProvider[]>([])
  const [ssoBindings, setSsoBindings] = useState<SsoBinding[]>([])
  const [reminder, setReminder] = useState<MyReminder>({ enabled: false, push_time: '22:00', last_sent_date: null })
  const [reminderTime, setReminderTime] = useState('22:00')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/me/profile')
      if (!res.ok) throw new Error()
      setProfile((await res.json()) as ProfileData)
    } catch {
      toast('加载资料失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const loadPasskeys = useCallback(async () => {
    try {
      const res = await apiFetch('/api/passkey/credentials')
      if (res.ok) setPasskeys((await res.json()) as PasskeyItem[])
    } catch {
      /* 忽略 */
    }
  }, [])

  useEffect(() => {
    if (profile?.passkey_enabled) loadPasskeys()
  }, [profile?.passkey_enabled, loadPasskeys])

  useEffect(() => {
    if (!profile?.oidc_enabled) return
    ;(async () => {
      try {
        const [pRes, bRes] = await Promise.all([
          fetch('/api/oidc/providers'),
          apiFetch('/api/oidc/my-bindings'),
        ])
        if (pRes.ok) setSsoProviders((await pRes.json()) as SsoProvider[])
        if (bRes.ok) setSsoBindings((await bRes.json()) as SsoBinding[])
      } catch {
        /* 忽略 */
      }
    })()
  }, [profile?.oidc_enabled])

  async function unlinkSso(providerId: string) {
    const res = await apiFetch(`/api/oidc/bindings/${providerId}`, { method: 'DELETE' })
    if (res.ok) {
      toast('已解绑', 'success')
      setSsoBindings((list) => list.filter((b) => b.provider_id !== providerId))
    } else {
      toast(await readError(res), 'error')
    }
  }

  useEffect(() => {
    ;(async () => {
      try {
        const res = await apiFetch('/api/user/me/reminder')
        if (res.ok) {
          const data = (await res.json()) as MyReminder
          setReminder(data)
          setReminderTime(data.push_time)
        }
      } catch {
        /* 忽略 */
      }
    })()
  }, [])

  async function saveReminder(patch: { enabled?: boolean; push_time?: string }) {
    const res = await apiFetch('/api/user/me/reminder', {
      method: 'PUT',
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      const data = (await res.json()) as MyReminder
      setReminder(data)
      setReminderTime(data.push_time)
      toast(data.enabled ? '提醒已启用' : '提醒已关闭', 'success')
    } else {
      toast(await readError(res), 'error')
    }
  }

  function saveReminderTime() {
    const t = reminderTime.trim()
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(t)) return toast('时间格式应为 HH:MM，如 22:00', 'error')
    saveReminder({ push_time: t })
  }

  async function linkSso(providerId: string) {
    try {
      const res = await apiFetch(`/api/oidc/link/start/${providerId}`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        window.location.href = data.url as string
      } else {
        toast(await readError(res), 'error')
      }
    } catch {
      toast('绑定失败', 'error')
    }
  }

  const avatarSrc =
    profile?.avatar_url ?? (profile?.qq_id ? `https://q1.qlogo.cn/g?b=qq&nk=${profile.qq_id}&s=640` : null)

  async function uploadAvatar(file: File) {
    if (!profile?.avatar_upload_allowed) return toast('系统未开放头像上传', 'error')
    const form = new FormData()
    form.append('file', file)
    const res = await apiFetch('/api/me/avatar', { method: 'POST', body: form })
    if (res.ok) {
      toast('头像已更新', 'success')
      load()
    } else {
      toast(await readError(res), 'error')
    }
  }

  async function removeAvatar() {
    const res = await apiFetch('/api/me/avatar', { method: 'DELETE' })
    if (res.ok) {
      toast('头像已删除', 'success')
      load()
    } else {
      toast(await readError(res), 'error')
    }
  }

  async function changePassword() {
    if (!newPw) return toast('请输入新密码', 'error')
    if (newPw.length < 6) return toast('新密码至少 6 位', 'error')
    if (newPw !== confirmPw) return toast('两次输入的新密码不一致', 'error')
    if (profile?.password_set && !oldPw) return toast('请输入原密码', 'error')
    const res = await apiFetch('/api/me/password', {
      method: 'POST',
      body: JSON.stringify({ old_password: oldPw, new_password: newPw }),
    })
    if (res.ok) {
      setOldPw('')
      setNewPw('')
      setConfirmPw('')
      toast('密码已更新', 'success')
      load()
    } else {
      toast(await readError(res), 'error')
    }
  }

  async function sendBindCode() {
    if (!bindEmail.includes('@')) return toast('请输入有效邮箱', 'error')
    const res = await apiFetch('/api/me/email/bind', {
      method: 'POST',
      body: JSON.stringify({ email: bindEmail.trim() }),
    })
    if (res.ok) {
      setBindSent(true)
      toast('验证码已发送', 'success')
    } else {
      toast(await readError(res), 'error')
    }
  }

  async function verifyBind() {
    if (!bindCode) return toast('请输入验证码', 'error')
    const res = await apiFetch('/api/me/email/verify', {
      method: 'POST',
      body: JSON.stringify({ email: bindEmail.trim(), code: bindCode.trim() }),
    })
    if (res.ok) {
      setBindEmail('')
      setBindCode('')
      setBindSent(false)
      toast('邮箱绑定成功', 'success')
      load()
    } else {
      toast(await readError(res), 'error')
    }
  }

  async function addPasskey() {
    if (!profile?.passkey_enabled) return
    try {
      const optRes = await apiFetch('/api/passkey/register/options', { method: 'POST' })
      if (!optRes.ok) {
        toast((await readError(optRes)) || '获取注册选项失败', 'error')
        return
      }
      const { options } = await optRes.json()
      const credential = await startRegistration(options)
      const res = await apiFetch('/api/passkey/register/verify', {
        method: 'POST',
        body: JSON.stringify({ credential }),
      })
      if (res.ok) {
        toast('通行密钥已添加', 'success')
        loadPasskeys()
      } else {
        toast(await readError(res), 'error')
      }
    } catch (e: any) {
      toast(e?.message || '添加通行密钥失败', 'error')
    }
  }

  async function deletePasskey(id: number) {
    const res = await apiFetch(`/api/passkey/credentials/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast('通行密钥已删除', 'success')
      loadPasskeys()
    } else {
      toast(await readError(res), 'error')
    }
  }

  if (loading && !profile) return <LinearProgress />

  return (
    <Stack spacing={2} sx={{ maxWidth: 560 }}>
      <Card>
        <CardHeader
          title={
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <AccountCircleIcon color="primary" />
              <span>账户信息</span>
            </Stack>
          }
          titleTypographyProps={{ variant: 'h6' }}
        />
        <CardContent>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Avatar src={avatarSrc ?? undefined} sx={{ width: 72, height: 72, fontSize: 28 }}>
              {profile?.name?.charAt(0) ?? '?'}
            </Avatar>
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="h6">{profile?.name}</Typography>
                <Chip
                  label={profile?.role === 'admin' ? '管理员' : '用户'}
                  size="small"
                  color={profile?.role === 'admin' ? 'primary' : 'default'}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {profile?.role === 'admin'
                  ? `管理员账户${profile?.email ? ` · 邮箱 ${profile.email}${profile.email_verified ? '（已验证）' : '（未验证）'}` : ''}`
                  : `用户ID ${profile?.user_id ?? '-'} · QQ ${
                      profile?.qq_id ?? '未绑定'
                    }${profile?.email ? ` · 邮箱 ${profile.email}${profile.email_verified ? '（已验证）' : '（未验证）'}` : ''}`}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title={
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <CloudUploadIcon color="primary" />
              <span>头像设置</span>
            </Stack>
          }
          titleTypographyProps={{ variant: 'h6' }}
        />
        <CardContent>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Avatar src={avatarSrc ?? undefined} sx={{ width: 96, height: 96, fontSize: 36 }}>
              {profile?.name?.charAt(0) ?? '?'}
            </Avatar>
            <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
              {profile?.avatar_upload_allowed && (
                <>
                  <Button variant="tonal" startIcon={<CloudUploadIcon />} onClick={() => fileRef.current?.click()}>
                    上传头像
                  </Button>
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
                </>
              )}
              {profile?.has_avatar && (
                <Button size="small" color="error" variant="outlined" onClick={removeAvatar}>
                  {profile?.qq_id ? '删除头像（回退 QQ 头像）' : '删除头像'}
                </Button>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {profile?.allow_email_binding && (
        <Card>
          <CardHeader
            title={
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <EmailIcon color="primary" />
                <span>邮箱绑定</span>
              </Stack>
            }
            titleTypographyProps={{ variant: 'h6' }}
          />
          <CardContent>
            {profile.email ? (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="body1">{profile.email}</Typography>
                <Chip
                  label={profile.email_verified ? '已验证' : '未验证'}
                  size="small"
                  color={profile.email_verified ? 'success' : 'warning'}
                />
              </Stack>
            ) : (
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <TextField
                    label="邮箱地址"
                    value={bindEmail}
                    onChange={(e) => setBindEmail(e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <Button variant="tonal" onClick={sendBindCode} disabled={bindSent}>
                    {bindSent ? '已发送' : '发送验证码'}
                  </Button>
                </Stack>
                {bindSent && (
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <TextField
                      label="邮箱中的验证码"
                      value={bindCode}
                      onChange={(e) => setBindCode(e.target.value)}
                      sx={{ flex: 1 }}
                    />
                    <Button variant="contained" onClick={verifyBind}>
                      验证并绑定
                    </Button>
                  </Stack>
                )}
                <Typography variant="caption" color="text.secondary">
                  绑定后可用邮箱作为账号登录
                </Typography>
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      {profile?.oidc_enabled && (
        <Card>
          <CardHeader
            title={
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <LinkIcon color="primary" />
                <span>SSO 绑定</span>
              </Stack>
            }
            titleTypographyProps={{ variant: 'h6' }}
          />
          <CardContent>
            {ssoProviders.length === 0 ? (
              <Typography color="text.secondary">暂无可用登录方式</Typography>
            ) : (
              <Stack spacing={1.5}>
                {ssoProviders.map((p) => {
                  const bound = ssoBindings.find((b) => b.provider_id === p.id)
                  return (
                    <Stack
                      key={p.id}
                      direction="row"
                      spacing={1.5}
                      sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <OidcIcon icon={p.icon} iconUrl={p.icon_url} />
                        <Typography variant="body1">{p.name}</Typography>
                        {bound?.email && (
                          <Typography variant="caption" color="text.secondary">
                            {bound.email}
                          </Typography>
                        )}
                      </Stack>
                      {bound ? (
                        <Button size="small" color="error" variant="outlined" onClick={() => unlinkSso(p.id)}>
                          解绑
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="tonal"
                          startIcon={<LinkIcon />}
                          onClick={() => linkSso(p.id)}
                        >
                          绑定
                        </Button>
                      )}
                    </Stack>
                  )
                })}
                <Typography variant="caption" color="text.secondary">
                  绑定后可用该登录方式快速登录本账号
                </Typography>
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader
          title={
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <NotificationsActiveIcon color="primary" />
              <span>定时提醒</span>
            </Stack>
          }
          titleTypographyProps={{ variant: 'h6' }}
        />
        <CardContent>
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={reminder.enabled}
                  onChange={(e) => saveReminder({ enabled: e.target.checked })}
                />
              }
              label="启用每日代肝提醒"
            />
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <TextField
                label="推送时间 HH:MM"
                value={reminderTime}
                disabled={!reminder.enabled}
                onChange={(e) => setReminderTime(e.target.value)}
                sx={{ width: 180 }}
              />
              <Button variant="tonal" disabled={!reminder.enabled} onClick={saveReminderTime}>
                保存时间
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {reminder.enabled
                ? `已启用 · 每天 ${reminder.push_time} 推送${
                    reminder.last_sent_date === new Date().toISOString().slice(0, 10)
                      ? ' · 今日已推送'
                      : ''
                  }`
                : '启用后每天按时推送今日代肝状态'}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {profile?.passkey_enabled && (
        <Card>
          <CardHeader
            title={
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <KeyIcon color="primary" />
                <span>通行密钥（Passkey）</span>
              </Stack>
            }
            action={
              <Button size="small" variant="tonal" onClick={addPasskey}>
                添加通行密钥
              </Button>
            }
            titleTypographyProps={{ variant: 'h6' }}
          />
          <CardContent>
            {passkeys.length === 0 ? (
              <Typography color="text.secondary">尚未添加通行密钥</Typography>
            ) : (
              <Stack spacing={1}>
                {passkeys.map((p) => (
                  <Stack
                    key={p.id}
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Typography variant="body2">
                      通行密钥 · {p.credential_id}
                      {p.created_at ? ` · ${new Date(p.created_at).toLocaleDateString()}` : ''}
                    </Typography>
                    <Button size="small" color="error" variant="outlined" onClick={() => deletePasskey(p.id)}>
                      删除
                    </Button>
                  </Stack>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader
          title={
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <LockResetIcon color="primary" />
              <span>{profile?.password_set ? '修改密码' : '设置密码'}</span>
            </Stack>
          }
          titleTypographyProps={{ variant: 'h6' }}
        />
        <CardContent>
          <Stack spacing={2}>
            {profile?.password_set && (
              <TextField
                label="原密码"
                type="password"
                value={oldPw}
                onChange={(e) => setOldPw(e.target.value)}
              />
            )}
            <TextField
              label="新密码（至少 6 位）"
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
            />
            <TextField
              label="确认新密码"
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && changePassword()}
            />
            <Button variant="contained" onClick={changePassword} sx={{ alignSelf: 'flex-start' }}>
              保存
            </Button>
            {!profile?.password_set && (
              <Typography variant="caption" color="text.secondary">
                设置密码后即可在登录页通过「用户登录」使用账号密码登录
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
