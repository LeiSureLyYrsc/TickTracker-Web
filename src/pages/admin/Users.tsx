import { useCallback, useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputAdornment from '@mui/material/InputAdornment'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import SearchIcon from '@mui/icons-material/Search'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import { apiFetch, readError } from '../../lib/api'
import { useToast } from '../../lib/toast'
import { useConfirm } from '../../lib/confirm'
import { useColumnCount } from '../../lib/columns'
import ColumnCountSelect from '../../components/ColumnCountSelect'
import MasonryColumns from '../../components/MasonryColumns'
import AliasDialog, { type AliasTarget } from '../../components/AliasDialog'
import type { User } from '../../types'

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString() : '-'
}

interface EditState {
  open: boolean
  user: User | null
  name: string
  email: string
  moveOld: boolean
  disable: boolean
}

const CLOSED: EditState = { open: false, user: null, name: '', email: '', moveOld: false, disable: false }

export default function Users() {
  const toast = useToast()
  const confirm = useConfirm()
  const { columns, setColumns } = useColumnCount('ct_users_cols')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [search, setSearch] = useState('')
  const [qqDraft, setQqDraft] = useState<Record<number, string>>({})
  const [edit, setEdit] = useState<EditState>(CLOSED)
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        String(u.id).includes(q) ||
        (u.qq_id !== null && u.qq_id !== undefined && String(u.qq_id).includes(q)) ||
        (u.aliases ?? []).some((a) => a.toLowerCase().includes(q)) ||
        (u.email ?? '').toLowerCase().includes(q),
    )
  }, [users, search])

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

  function openEdit(u: User) {
    setEdit({
      open: true,
      user: u,
      name: u.name,
      email: u.email ?? '',
      moveOld: false,
      disable: !!u.login_disabled,
    })
  }

  async function saveEdit() {
    const u = edit.user
    if (!u) return
    const body: Record<string, unknown> = {}
    if (u.is_admin) {
      const newName = edit.name.trim()
      if (newName && newName !== u.name) body.name = newName
      if (edit.email.trim() !== (u.email ?? '')) body.email = edit.email.trim() || null
    } else {
      const newName = edit.name.trim()
      if (newName && newName !== u.name) {
        body.name = newName
        body.move_old_to_alias = edit.moveOld
      }
      if (edit.email.trim() !== (u.email ?? '')) body.email = edit.email.trim() || null
      if (edit.disable !== !!u.login_disabled) body.login_disabled = edit.disable
    }
    if (Object.keys(body).length === 0) {
      setEdit(CLOSED)
      return
    }
    const res = await apiFetch(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setEdit(CLOSED)
      toast('已保存', 'success')
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
        <CardHeader
          title={
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <PersonAddIcon color="primary" />
              <span>创建用户</span>
            </Stack>
          }
          titleTypographyProps={{ variant: 'h6' }}
        />
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

      <Stack
        direction="row"
        spacing={2}
        sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap', rowGap: 1.5 }}
      >
        <TextField
          size="small"
          placeholder="搜索 名称 / 别名 / QQ / ID / 邮箱"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ maxWidth: 320 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Typography color="text.secondary" variant="body2">
          共 {filtered.length} 个用户
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <ColumnCountSelect value={columns} onChange={setColumns} />
        <Button onClick={load}>刷新</Button>
      </Stack>

      {loading && <LinearProgress />}

      <MasonryColumns
        items={filtered}
        columns={columns}
        renderItem={(u) => (
          <Card>
            <CardHeader
              title={
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="h6">{u.name}</Typography>
                  <Chip label={`#${u.id}`} size="small" variant="outlined" />
                  {u.is_admin && <Chip label="管理员" size="small" color="primary" />}
                  {u.login_disabled && <Chip label="已停用" size="small" color="error" />}
                </Stack>
              }
              subheader={`注册于 ${formatDate(u.created_at)}`}
              action={
                <Stack direction="row" spacing={0.5}>
                  <Button size="small" onClick={() => openEdit(u)}>
                    编辑
                  </Button>
                  {!u.is_admin && (
                    <Button size="small" color="error" variant="outlined" onClick={() => remove(u)}>
                      删除
                    </Button>
                  )}
                </Stack>
              }
            />
            <Divider />
            <CardContent>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    别名
                  </Typography>
                  <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                    {(u.aliases ?? []).map((a) => (
                      <Chip key={a} label={a} size="small" />
                    ))}
                    <Button size="small" onClick={() => manageAliases(u)}>
                      管理别名
                    </Button>
                  </Stack>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    邮箱
                  </Typography>
                  <Typography variant="body2">{u.email ?? '未设置'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    QQ 绑定
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <TextField
                      size="small"
                      type="number"
                      value={qqDraft[u.id] ?? ''}
                      placeholder="未绑定"
                      sx={{ width: 130 }}
                      onChange={(e) => setQqDraft((d) => ({ ...d, [u.id]: e.target.value }))}
                    />
                    <Button size="small" variant="tonal" onClick={() => bindQQ(u, qqDraft[u.id] ?? '')}>
                      绑定
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}
      />

      {!loading && filtered.length === 0 && (
        <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
          {search ? '无匹配用户' : '暂无用户'}
        </Typography>
      )}

      <Dialog open={edit.open} onClose={() => setEdit(CLOSED)} fullWidth maxWidth="xs">
        <DialogTitle>编辑用户 - {edit.user?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="主要名称"
              value={edit.name}
              onChange={(e) => setEdit({ ...edit, name: e.target.value })}
            />
            {!edit.user?.is_admin && edit.name.trim() && edit.name.trim() !== edit.user?.name && (
              <FormControlLabel
                control={
                  <Switch
                    checked={edit.moveOld}
                    onChange={(e) => setEdit({ ...edit, moveOld: e.target.checked })}
                  />
                }
                label="将原名称加入别名"
              />
            )}
            <TextField
              label="邮箱"
              value={edit.email}
              onChange={(e) => setEdit({ ...edit, email: e.target.value })}
            />
            {!edit.user?.is_admin && (
              <FormControlLabel
                control={
                  <Switch
                    checked={edit.disable}
                    onChange={(e) => setEdit({ ...edit, disable: e.target.checked })}
                  />
                }
                label="停用 WebUI 登录"
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEdit(CLOSED)}>取消</Button>
          <Button variant="contained" onClick={saveEdit}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <AliasDialog
        open={alias.open}
        target={alias.target}
        onClose={() => setAlias({ open: false, target: null })}
        onRefresh={load}
      />
    </Box>
  )
}
