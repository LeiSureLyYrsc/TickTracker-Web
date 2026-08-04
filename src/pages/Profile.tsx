import { useCallback, useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import LockResetIcon from '@mui/icons-material/LockReset'
import EmailIcon from '@mui/icons-material/Email'
import KeyIcon from '@mui/icons-material/Key'
import { startRegistration } from '@simplewebauthn/browser'
import { apiFetch, readError } from '../lib/api'
import { useToast } from '../lib/toast'

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
}

interface PasskeyItem {
  id: number
  credential_id: string
  created_at: string | null
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
