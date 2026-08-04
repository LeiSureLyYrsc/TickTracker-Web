import { useCallback, useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import DeleteIcon from '@mui/icons-material/Delete'
import { apiFetch, readError } from '../../lib/api'
import { useToast } from '../../lib/toast'
import type { Commission, ReminderSetting, User } from '../../types'

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

export default function Reminders() {
  const toast = useToast()
  const [list, setList] = useState<ReminderSetting[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(false)
  const [template, setTemplate] = useState('')
  const [newUser, setNewUser] = useState('')
  const [newTime, setNewTime] = useState('22:00')
  const [newEnabled, setNewEnabled] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rRes, uRes, cRes] = await Promise.all([
        apiFetch('/api/admin/reminders'),
        apiFetch('/api/admin/users'),
        apiFetch('/api/admin/commissions'),
      ])
      if (!rRes.ok || !uRes.ok || !cRes.ok) throw new Error()
      setList((await rRes.json()) as ReminderSetting[])
      setUsers((await uRes.json()) as User[])
      setCommissions((await cRes.json()) as Commission[])
    } catch {
      toast('加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  const loadTemplate = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/reminders/template')
      if (res.ok) setTemplate((await res.json()).template as string)
    } catch {
      /* 忽略 */
    }
  }, [])

  useEffect(() => {
    load()
    loadTemplate()
  }, [load, loadTemplate])

  const eligibleUsers = useMemo(() => {
    const withComm = new Set(commissions.map((c) => c.user_id))
    return users.filter(
      (u) =>
        u.role !== 'admin' &&
        u.qq_id != null &&
        u.qq_id !== undefined &&
        withComm.has(u.id),
    )
  }, [users, commissions])

  const hasSettingIds = useMemo(() => new Set(list.map((r) => r.user_id)), [list])
  const addOptions = eligibleUsers.filter((u) => !hasSettingIds.has(u.id))

  async function add() {
    const user = users.find((u) => String(u.id) === newUser)
    if (!user) return toast('请选择用户', 'error')
    if (!TIME_RE.test(newTime)) return toast('时间格式应为 HH:MM，如 22:00', 'error')
    const res = await apiFetch('/api/admin/reminders', {
      method: 'POST',
      body: JSON.stringify({ user_name: user.name, push_time: newTime, enabled: newEnabled }),
    })
    if (res.ok) {
      toast('已添加提醒', 'success')
      setNewUser('')
      load()
    } else {
      toast(await readError(res), 'error')
    }
  }

  async function update(r: ReminderSetting, patch: { push_time?: string; enabled?: boolean }) {
    const res = await apiFetch(`/api/admin/reminders/${r.user_id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      toast('已保存', 'success')
      load()
    } else {
      toast(await readError(res), 'error')
    }
  }

  async function remove(r: ReminderSetting) {
    const res = await apiFetch(`/api/admin/reminders/${r.user_id}`, { method: 'DELETE' })
    if (res.ok) {
      toast('已删除', 'success')
      load()
    } else {
      toast(await readError(res), 'error')
    }
  }

  async function saveTemplate() {
    const res = await apiFetch('/api/admin/reminders/template', {
      method: 'PUT',
      body: JSON.stringify({ template }),
    })
    if (res.ok) {
      toast('模板已保存', 'success')
    } else {
      toast(await readError(res), 'error')
    }
  }

  async function resetTemplate() {
    const res = await apiFetch('/api/admin/reminders/template/reset', { method: 'POST' })
    if (res.ok) {
      setTemplate((await res.json()).template as string)
      toast('已恢复默认模板', 'success')
    } else {
      toast(await readError(res), 'error')
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <Box sx={{ maxWidth: 720 }}>
      <Card sx={{ mb: 2 }}>
        <CardHeader
          title={
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <PersonAddIcon color="primary" />
              <span>新增提醒</span>
            </Stack>
          }
          titleTypographyProps={{ variant: 'h6' }}
        />
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'center' }}>
            <Select
              size="small"
              displayEmpty
              value={newUser}
              onChange={(e) => setNewUser(e.target.value)}
              sx={{ minWidth: 220, flex: 1 }}
              renderValue={(v) =>
                v
                  ? users.find((u) => String(u.id) === v)?.name ?? '请选择'
                  : '选择用户（已绑QQ且有代肝数据）'
              }
            >
              {addOptions.length === 0 && (
                <MenuItem value="" disabled>
                  暂无符合资格的用户
                </MenuItem>
              )}
              {addOptions.map((u) => (
                <MenuItem key={u.id} value={String(u.id)}>
                  {u.name}（QQ:{u.qq_id}）
                </MenuItem>
              ))}
            </Select>
            <TextField
              size="small"
              label="推送时间"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              sx={{ width: 120 }}
            />
            <FormControlLabel
              control={
                <Switch checked={newEnabled} onChange={(e) => setNewEnabled(e.target.checked)} />
              }
              label="启用"
            />
            <Button variant="contained" onClick={add}>
              添加
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            仅「已绑定 QQ 且有代肝数据」的用户可被推送；用户也可自行使用 /代肝提醒开启 开启。
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardHeader
          title={
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <NotificationsActiveIcon color="primary" />
              <span>提醒列表（{list.length}）</span>
            </Stack>
          }
          action={
            <Button size="small" onClick={load}>
              刷新
            </Button>
          }
          titleTypographyProps={{ variant: 'h6' }}
        />
        <CardContent>
          {loading && <LinearProgress sx={{ mb: 1 }} />}
          {!loading && list.length === 0 && (
            <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
              暂无提醒设置
            </Typography>
          )}
          <Stack spacing={1}>
            {list.map((r) => (
              <Stack
                key={r.user_id}
                direction="row"
                spacing={1.5}
                sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
              >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Typography variant="body1">
                    <strong>{r.user_name}</strong>
                  </Typography>
                  <Chip label={`QQ:${r.qq_id ?? '未绑定'}`} size="small" variant="outlined" />
                  {r.last_sent_date === today && <Chip label="今日已发" size="small" color="success" />}
                </Stack>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <TextField
                    size="small"
                    value={r.push_time}
                    sx={{ width: 96 }}
                    onChange={(e) => {
                      const v = e.target.value
                      if (TIME_RE.test(v)) update(r, { push_time: v })
                    }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={r.enabled}
                        onChange={(e) => update(r, { enabled: e.target.checked })}
                      />
                    }
                    label="启用"
                  />
                  <IconButton size="small" color="error" onClick={() => remove(r)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title={
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <NotificationsActiveIcon color="primary" />
              <span>消息模板</span>
            </Stack>
          }
          titleTypographyProps={{ variant: 'h6' }}
        />
        <CardContent>
          <Stack spacing={2}>
            <TextField
              multiline
              minRows={5}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              helperText="支持变量：{name} 用户名 · {groups} 按游戏组的状态列表 · {done} 已打卡 · {total} 游戏数 · {list} 逐游戏状态 · {note} 当日备注"
            />
            <Stack direction="row" spacing={1.5}>
              <Button variant="contained" onClick={saveTemplate}>
                保存模板
              </Button>
              <Button variant="tonal" startIcon={<RestartAltIcon />} onClick={resetTemplate}>
                重置为默认模板
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
