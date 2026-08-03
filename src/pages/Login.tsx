import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import SportsEsportsIcon from '@mui/icons-material/SportsEsports'
import { setAuth, useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'

export default function Login() {
  const navigate = useNavigate()
  const toast = useToast()
  const auth = useAuth()
  const [tab, setTab] = useState(0)
  const [adminPw, setAdminPw] = useState('')
  const [userCode, setUserCode] = useState('')
  const [loading, setLoading] = useState(false)

  if (auth.role === 'admin') return <Navigate to="/admin/commissions" replace />
  if (auth.role === 'user') return <Navigate to="/user/commissions" replace />

  async function adminLogin() {
    if (!adminPw) return toast('请输入密码', 'error')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPw }),
      })
      const data = await res.json()
      if (res.ok) {
        setAuth(data.token, 'admin')
        toast('登录成功', 'success')
        navigate('/admin/commissions')
      } else {
        toast(data.detail || '登录失败', 'error')
      }
    } catch {
      toast('网络错误', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function userLogin() {
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
      } else {
        toast(data.detail || '验证码无效', 'error')
      }
    } catch {
      toast('网络错误', 'error')
    } finally {
      setLoading(false)
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
          <Tab label="管理员登录" />
          <Tab label="用户登录" />
        </Tabs>

        {tab === 0 ? (
          <Stack spacing={2} sx={{ textAlign: 'left' }}>
            <TextField
              label="管理员密码"
              type="password"
              fullWidth
              value={adminPw}
              onChange={(e) => setAdminPw(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && adminLogin()}
            />
            <Button variant="contained" size="large" disabled={loading} onClick={adminLogin}>
              {loading ? <CircularProgress size={24} color="inherit" /> : '登 录'}
            </Button>
            <Typography variant="caption" color="text.secondary" align="center">
              未设置密码？向 Bot 发送 <code>/代肝管理员密码设置 你的密码</code>
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={2} sx={{ textAlign: 'left' }}>
            <TextField
              label="6位验证码"
              fullWidth
              value={userCode}
              slotProps={{ htmlInput: { maxLength: 6 } }}
              onChange={(e) => setUserCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && userLogin()}
            />
            <Button variant="contained" size="large" disabled={loading} onClick={userLogin}>
              {loading ? <CircularProgress size={24} color="inherit" /> : '登 录'}
            </Button>
            <Typography variant="caption" color="text.secondary" align="center">
              向 Bot 发送 <code>/代肝登录</code> 获取验证码（5分钟有效）
            </Typography>
          </Stack>
        )}
      </Paper>
    </Box>
  )
}
