import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useColorScheme } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import SportsEsportsIcon from '@mui/icons-material/SportsEsports'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import KeyIcon from '@mui/icons-material/Key'
import { startAuthentication } from '@simplewebauthn/browser'
import { setAuth, useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import OidcIcon from '../lib/oidcIcons'

interface AuthConfig {
  allow_forgot_password: boolean
  passkey_enabled: boolean
  oidc_providers: Array<{ id: string; name: string; icon: string; icon_url?: string }>
}

export default function Login() {
  const navigate = useNavigate()
  const toast = useToast()
  const auth = useAuth()
  const { mode, systemMode, setMode } = useColorScheme()
  const [mounted, setMounted] = useState(false)
  const [config, setConfig] = useState<AuthConfig>({
    allow_forgot_password: false,
    passkey_enabled: false,
    oidc_providers: [],
  })
  const [tab, setTab] = useState(0)
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [userCode, setUserCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotStep, setForgotStep] = useState<'send' | 'reset'>('send')
  const [fpAccount, setFpAccount] = useState('')
  const [fpCode, setFpCode] = useState('')
  const [fpPassword, setFpPassword] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    fetch('/api/auth/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setConfig(d))
      .catch(() => {})
  }, [])

  const isDark = mounted && (mode === 'system' ? systemMode : mode) === 'dark'

  if (auth.role === 'admin') return <Navigate to="/admin/commissions" replace />
  if (auth.role === 'user') return <Navigate to="/user/commissions" replace />

  async function accountLogin() {
    const acc = account.trim()
    if (!acc) return toast('请输入账号', 'error')
    if (!password) return toast('请输入密码', 'error')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: acc, password }),
      })
      const data = await res.json()
      if (res.ok) {
        if (data.role === 'admin') {
          setAuth(data.token, 'admin', data.user_name ?? 'admin')
          navigate('/admin/commissions')
        } else {
          setAuth(data.token, 'user', data.user_name, data.user_id)
          navigate('/user/commissions')
        }
        toast('登录成功', 'success')
      } else if (res.status === 429) {
        toast(data.detail || '尝试次数过多，请稍后再试', 'error')
      } else {
        toast(data.detail || '账号或密码错误', 'error')
      }
    } catch {
      toast('网络错误', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function codeLogin() {
    if (!userCode || userCode.length !== 6) return toast('请输入 6 位验证码', 'error')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/user/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: userCode }),
      })
      const data = await res.json()
      if (res.ok) {
        setAuth(data.token, 'user', data.user_name, data.user_id)
        toast('登录成功', 'success')
        navigate('/user/commissions')
      } else if (res.status === 429) {
        toast(data.detail || '验证码请求过于频繁，请稍后再试', 'error')
      } else {
        toast(data.detail || '验证码无效', 'error')
      }
    } catch {
      toast('网络错误', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function passkeyLogin() {
    const acc = account.trim()
    if (!acc) return toast('请先在「用户登录」中填写用户名', 'error')
    setLoading(true)
    try {
      const optRes = await fetch('/api/passkey/login/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: acc }),
      })
      const optData = await optRes.json()
      if (!optRes.ok) {
        toast(optData.detail || '获取认证选项失败', 'error')
        return
      }
      const credential = await startAuthentication(optData.options)
      const res = await fetch('/api/passkey/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: acc, credential }),
      })
      const data = await res.json()
      if (res.ok) {
        if (data.role === 'admin') {
          setAuth(data.token, 'admin', data.user_name ?? 'admin')
          navigate('/admin/commissions')
        } else {
          setAuth(data.token, 'user', data.user_name, data.user_id)
          navigate('/user/commissions')
        }
        toast('登录成功', 'success')
      } else {
        toast(data.detail || 'Passkey 登录失败', 'error')
      }
    } catch (e: any) {
      toast(e?.message || 'Passkey 登录失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  function oidcLogin(providerId: string) {
    window.location.href = `/api/oidc/login/${providerId}`
  }

  async function forgotSend() {
    if (!fpAccount.trim()) return toast('请输入账号', 'error')
    const res = await fetch('/api/auth/forgot/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: fpAccount.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      setForgotStep('reset')
      toast('若该账号绑定了已验证邮箱，重置验证码已发送', 'success')
    } else {
      toast(data.detail || '操作失败', 'error')
    }
  }

  async function forgotReset() {
    if (!fpCode || fpPassword.length < 6) return toast('请填写验证码与至少 6 位的新密码', 'error')
    const res = await fetch('/api/auth/forgot/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account: fpAccount.trim(),
        code: fpCode.trim(),
        new_password: fpPassword,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setForgotOpen(false)
      setForgotStep('send')
      setFpAccount('')
      setFpCode('')
      setFpPassword('')
      toast('密码已重置，请使用新密码登录', 'success')
    } else {
      toast(data.detail || '重置失败', 'error')
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 3,
      }}
    >
      <Box
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 1,
        }}
      >
        <IconButton onClick={() => setMode(isDark ? 'light' : 'dark')} aria-label="切换明暗模式">
          {isDark ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
      </Box>
      <Paper
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 420,
          textAlign: 'center',
          borderRadius: 5,
          border: '1px solid',
          borderColor: 'outlineVariant',
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            mx: 'auto',
            mb: 2,
            borderRadius: 5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'primaryContainer',
            color: 'onPrimaryContainer',
          }}
        >
          <SportsEsportsIcon sx={{ fontSize: 34 }} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 500, mb: 0.5 }}>
          代肝记录系统
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          欢迎回来，请登录
        </Typography>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ mb: 2 }}>
          <Tab label="用户登录" />
          <Tab label="验证码登录" />
        </Tabs>

        {tab === 0 ? (
          <Stack spacing={2} sx={{ textAlign: 'left' }}>
            <TextField
              label="用户名 / 邮箱"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && accountLogin()}
            />
            <TextField
              label="密码"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && accountLogin()}
            />
            <Button variant="contained" size="large" disabled={loading} onClick={accountLogin}>
              {loading ? <CircularProgress size={24} color="inherit" /> : '登 录'}
            </Button>
            {config.allow_forgot_password && (
              <Typography variant="caption" align="center">
                <Box
                  component="a"
                  onClick={() => setForgotOpen(true)}
                  sx={{ color: 'primary.main', cursor: 'pointer' }}
                >
                  忘记密码？
                </Box>
              </Typography>
            )}

            {config.passkey_enabled && (
              <>
                <Divider>或</Divider>
                <Button
                  variant="tonal"
                  startIcon={<KeyIcon />}
                  disabled={loading}
                  onClick={passkeyLogin}
                >
                  使用通行密钥登录
                </Button>
              </>
            )}

            {config.oidc_providers.length > 0 && (
              <>
                <Divider>第三方登录</Divider>
                <Stack
                  direction="row"
                  spacing={1.5}
                  useFlexGap
                  sx={{ flexWrap: 'wrap', justifyContent: 'center' }}
                >
                  {config.oidc_providers.map((p) => (
                    <Button
                      key={p.id}
                      variant="outlined"
                      size="small"
                      startIcon={<OidcIcon icon={p.icon} iconUrl={p.icon_url} />}
                      onClick={() => oidcLogin(p.id)}
                    >
                      {p.name}
                    </Button>
                  ))}
                </Stack>
              </>
            )}
          </Stack>
        ) : (
          <Stack spacing={2} sx={{ textAlign: 'left' }}>
            <TextField
              label="6位验证码"
              fullWidth
              value={userCode}
              slotProps={{ htmlInput: { maxLength: 6 } }}
              onChange={(e) => setUserCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && codeLogin()}
            />
            <Button variant="contained" size="large" disabled={loading} onClick={codeLogin}>
              {loading ? <CircularProgress size={24} color="inherit" /> : '登 录'}
            </Button>
            <Typography variant="caption" color="text.secondary" align="center">
              向 Bot 发送 <code>/代肝登录</code> 获取验证码（5分钟有效）
            </Typography>
          </Stack>
        )}
      </Paper>

      <Dialog open={forgotOpen} onClose={() => setForgotOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>忘记密码</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="用户名 / 邮箱"
              value={fpAccount}
              disabled={forgotStep === 'reset'}
              onChange={(e) => setFpAccount(e.target.value)}
            />
            {forgotStep === 'send' ? (
              <Button variant="contained" onClick={forgotSend}>
                发送重置验证码
              </Button>
            ) : (
              <>
                <TextField
                  label="邮箱中的验证码"
                  value={fpCode}
                  onChange={(e) => setFpCode(e.target.value)}
                />
                <TextField
                  label="新密码（至少 6 位）"
                  type="password"
                  value={fpPassword}
                  onChange={(e) => setFpPassword(e.target.value)}
                />
                <Button variant="contained" onClick={forgotReset}>
                  重置密码
                </Button>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setForgotOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
