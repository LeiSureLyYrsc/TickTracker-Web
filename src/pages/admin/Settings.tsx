import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { apiFetch, readError } from '../../lib/api'
import { useToast } from '../../lib/toast'

export default function Settings() {
  const toast = useToast()
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  async function change() {
    if (!oldPw || !newPw) return toast('请填写完整', 'error')
    if (newPw !== confirmPw) return toast('两次输入的新密码不一致', 'error')
    if (newPw.length < 6) return toast('新密码至少 6 位', 'error')

    const res = await apiFetch('/api/auth/admin/change-password', {
      method: 'POST',
      body: JSON.stringify({ old_password: oldPw, new_password: newPw }),
    })
    if (res.ok) {
      setOldPw('')
      setNewPw('')
      setConfirmPw('')
      toast('密码修改成功', 'success')
    } else {
      toast(await readError(res), 'error')
    }
  }

  return (
    <Card sx={{ maxWidth: 420 }}>
      <CardHeader title="修改管理员密码" titleTypographyProps={{ variant: 'h6' }} />
      <CardContent>
        <Stack spacing={2}>
          <TextField
            label="原密码"
            type="password"
            value={oldPw}
            onChange={(e) => setOldPw(e.target.value)}
          />
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
            onKeyDown={(e) => e.key === 'Enter' && change()}
          />
          <Button variant="contained" onClick={change} sx={{ alignSelf: 'flex-start' }}>
            保存修改
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}
