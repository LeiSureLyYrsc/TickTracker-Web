import { useCallback, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { apiFetch, readError } from '../../lib/api'
import { useToast } from '../../lib/toast'
import { useConfirm } from '../../lib/confirm'
import AliasDialog, { type AliasTarget } from '../../components/AliasDialog'
import type { User } from '../../types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString()
}

export default function Users() {
  const toast = useToast()
  const confirm = useConfirm()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [qqDraft, setQqDraft] = useState<Record<number, string>>({})
  const [alias, setAlias] = useState<{ open: boolean; target: AliasTarget | null }>({
    open: false,
    target: null,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/admin/users')
      if (!res.ok) throw new Error()
      const list = (await res.json()) as User[]
      setUsers(list)
      const draft: Record<number, string> = {}
      for (const u of list) draft[u.id] = u.qq_id ? String(u.qq_id) : ''
      setQqDraft(draft)
    } catch {
      toast('加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  async function create() {
    const name = newName.trim()
    if (!name) return toast('请输入用户名', 'error')
    const res = await apiFetch('/api/admin/users', { method: 'POST', body: JSON.stringify({ name }) })
    if (res.ok) {
      setNewName('')
      toast('用户已创建', 'success')
      load()
    } else {
      toast(await readError(res), 'error')
    }
  }

  async function bindQQ(u: User, value: string) {
    const str = value.trim()
    const qqId = str ? Number(str) : null
    if (str && isNaN(qqId as number)) return toast('QQ号必须为数字', 'error')
    const res = await apiFetch(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ qq_id: qqId }),
    })
    if (res.ok) {
      u.qq_id = qqId
      setUsers((list) => [...list])
      toast('QQ 绑定成功', 'success')
    } else {
      toast(await readError(res), 'error')
    }
  }

  async function remove(u: User) {
    const ok = await confirm({
      title: '删除用户',
      message: `确认删除用户「${u.name}」？其代肝记录与留言将一并删除。`,
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    const res = await apiFetch(`/api/admin/users/${u.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast('用户已删除', 'success')
      load()
    } else {
      toast(await readError(res), 'error')
    }
  }

  function manageAliases(u: User) {
    setAlias({ open: true, target: { type: 'user', id: u.id, name: u.name, aliases: u.aliases } })
  }

  return (
    <Box>
      <Card sx={{ mb: 2 }}>
        <CardHeader title="创建用户" titleTypographyProps={{ variant: 'h6' }} />
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="新用户名"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              sx={{ flex: 1, maxWidth: { sm: 320 } }}
            />
            <Button variant="contained" onClick={create} sx={{ alignSelf: 'center' }}>
              创建
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {loading && <LinearProgress />}
      <TableContainer component={Card} sx={{ mt: 1 }}>
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>用户名</TableCell>
              <TableCell>别名</TableCell>
              <TableCell>QQ</TableCell>
              <TableCell>注册时间</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell>{u.id}</TableCell>
                <TableCell>
                  <strong>{u.name}</strong>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                    {u.aliases.map((a) => (
                      <Chip key={a} label={a} size="small" />
                    ))}
                    <Button size="small" onClick={() => manageAliases(u)}>
                      管理别名
                    </Button>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <TextField
                      size="small"
                      type="number"
                      value={qqDraft[u.id] ?? ''}
                      placeholder="未绑定"
                      sx={{ width: 120 }}
                      onChange={(e) =>
                        setQqDraft((d) => ({ ...d, [u.id]: e.target.value }))
                      }
                    />
                    <Button size="small" variant="tonal" onClick={() => bindQQ(u, qqDraft[u.id] ?? '')}>
                      绑定
                    </Button>
                  </Stack>
                </TableCell>
                <TableCell>{formatDate(u.created_at)}</TableCell>
                <TableCell>
                  <Button size="small" color="error" variant="outlined" onClick={() => remove(u)}>
                    删除
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <AliasDialog
        open={alias.open}
        target={alias.target}
        onClose={() => setAlias({ open: false, target: null })}
        onRefresh={load}
      />
    </Box>
  )
}
