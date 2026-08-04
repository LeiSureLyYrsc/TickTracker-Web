import { useCallback, useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputAdornment from '@mui/material/InputAdornment'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import SearchIcon from '@mui/icons-material/Search'
import { apiFetch, readError } from '../../lib/api'
import { useToast } from '../../lib/toast'
import { useColumnCount } from '../../lib/columns'
import ColumnCountSelect from '../../components/ColumnCountSelect'
import MasonryColumns from '../../components/MasonryColumns'
import FilterMultiSelect from '../../components/FilterMultiSelect'
import type { Game, GameGroup, Message } from '../../types'

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN')
}

export default function Messages() {
  const toast = useToast()
  const { columns, setColumns } = useColumnCount('ct_messages_cols')
  const [messages, setMessages] = useState<Message[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [groups, setGroups] = useState<GameGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState<string[]>([])
  const [gameFilter, setGameFilter] = useState<string[]>([])
  const [unreadOnly, setUnreadOnly] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [mRes, gRes, grpRes] = await Promise.all([
        apiFetch('/api/admin/messages'),
        apiFetch('/api/admin/games'),
        apiFetch('/api/admin/groups'),
      ])
      if (!mRes.ok || !gRes.ok || !grpRes.ok) throw new Error()
      setMessages((await mRes.json()) as Message[])
      setGames((await gRes.json()) as Game[])
      setGroups((await grpRes.json()) as GameGroup[])
    } catch {
      toast('加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const gameFilterOptions = useMemo(() => {
    const scoped = games.filter(
      (g) => groupFilter.length === 0 || groupFilter.includes(String(g.group_id)),
    )
    return [...scoped].sort((a, b) => (a.group_name ?? '未分组').localeCompare(b.group_name ?? '未分组', 'zh-CN'))
  }, [games, groupFilter])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = messages
    if (q) {
      list = list.filter(
        (m) =>
          m.user_name.toLowerCase().includes(q) ||
          m.game_name.toLowerCase().includes(q) ||
          m.content.toLowerCase().includes(q),
      )
    }
    if (groupFilter.length > 0) {
      const scope = new Set(
        games.filter((g) => groupFilter.includes(String(g.group_id))).map((g) => String(g.id)),
      )
      list = list.filter((m) => scope.has(String(m.game_id)))
    }
    if (gameFilter.length > 0) {
      list = list.filter((m) => gameFilter.includes(String(m.game_id)))
    }
    if (unreadOnly) {
      list = list.filter((m) => !m.is_read)
    }
    return [...list].sort((a, b) => {
      if (a.is_read !== b.is_read) return a.is_read ? 1 : -1
      return b.created_at.localeCompare(a.created_at)
    })
  }, [messages, search, groupFilter, gameFilter, unreadOnly, games])

  async function markRead(m: Message) {
    const res = await apiFetch(`/api/admin/messages/${m.id}/read`, { method: 'PATCH' })
    if (res.ok) {
      toast('已标记为已读', 'success')
      setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, is_read: true } : x)))
    } else {
      toast(await readError(res), 'error')
    }
  }

  return (
    <Box>
      <Card sx={{ p: 1.5, mb: 2 }}>
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}
        >
          <TextField
            size="small"
            placeholder="搜索用户名 / 游戏 / 内容"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ maxWidth: 260 }}
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
          <FilterMultiSelect
            label="游戏组"
            options={groups.map((g) => ({ value: String(g.id), label: g.name }))}
            value={groupFilter}
            onChange={(v) => {
              setGroupFilter(v)
              const scoped = new Set(
                games
                  .filter((g) => v.length === 0 || v.includes(String(g.group_id)))
                  .map((g) => String(g.id)),
              )
              setGameFilter((prev) => prev.filter((id) => scoped.has(id)))
            }}
          />
          <FilterMultiSelect
            label="游戏"
            options={gameFilterOptions.map((g) => ({ value: String(g.id), label: g.name }))}
            value={gameFilter}
            onChange={setGameFilter}
          />
          <FormControlLabel
            control={
              <Checkbox checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
            }
            label="只看未读"
          />
          <ColumnCountSelect value={columns} onChange={setColumns} />
          <Box sx={{ flexGrow: 1 }} />
          <Button onClick={load}>刷新</Button>
        </Stack>
      </Card>

      {loading && <LinearProgress />}

      <MasonryColumns
        items={visible}
        columns={columns}
        renderItem={(m) => (
          <Card
            sx={{
              p: 2,
              borderLeft: 4,
              borderColor: m.is_read ? 'transparent' : 'primary.main',
            }}
          >
            <Stack
              direction="row"
              spacing={2}
              sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
            >
              <Typography variant="body1">
                <strong>{m.user_name}</strong>{' '}
                <Typography component="span" color="text.secondary">
                  →
                </Typography>{' '}
                <Typography component="span" color="primary">
                  {m.game_name}
                </Typography>
              </Typography>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  {formatTime(m.created_at)}
                </Typography>
                {!m.is_read && (
                  <Button size="small" onClick={() => markRead(m)}>
                    标为已读
                  </Button>
                )}
              </Stack>
            </Stack>
            <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{m.content}</Typography>
          </Card>
        )}
      />
      {!loading && visible.length === 0 && (
        <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
          暂无留言
        </Typography>
      )}
    </Box>
  )
}
