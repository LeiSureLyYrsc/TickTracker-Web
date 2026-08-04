import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'

export default function OidcLinkCallback() {
  const navigate = useNavigate()
  const auth = useAuth()
  const toast = useToast()
  const [params] = useSearchParams()

  useEffect(() => {
    if (params.get('ok') === '1') toast('SSO 绑定成功', 'success')
    else toast('SSO 绑定失败', 'error')
    const path = auth.role === 'admin' ? '/admin/profile' : '/user/profile'
    navigate(path, { replace: true })
  }, [params, auth.role, navigate, toast])

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <CircularProgress />
    </Box>
  )
}
