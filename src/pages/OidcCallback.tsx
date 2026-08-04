import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import { setAuth } from '../lib/auth'

export default function OidcCallback() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    const code = params.get('code')
    if (!code) {
      setError('缺少会话码')
      return
    }
    ;(async () => {
      try {
        const res = await fetch('/api/oidc/consume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.detail || '登录失败')
          return
        }
        if (data.role === 'admin') {
          setAuth(data.token, 'admin', data.user_name ?? 'admin')
          navigate('/admin/commissions', { replace: true })
        } else {
          setAuth(data.token, 'user', data.user_name, data.user_id)
          navigate('/user/commissions', { replace: true })
        }
      } catch {
        setError('网络错误')
      }
    })()
  }, [params, navigate])

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      {error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <>
          <CircularProgress />
          <Typography color="text.secondary">正在登录…</Typography>
        </>
      )}
    </Box>
  )
}
