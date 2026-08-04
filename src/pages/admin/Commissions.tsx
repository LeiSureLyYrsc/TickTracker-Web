import { useCallback, useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import InputAdornment from '@mui/material/InputAdornment'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import SearchIcon from '@mui/icons-material/Search'
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd'
import { apiFetch, readError } from '../../lib/api'
import { useToast } from '../../lib/toast'
import { useConfirm } from '../../lib/confirm'
import { useColumnCount } from '../../lib/columns'
import ColumnCountSelect from '../../components/ColumnCountSelect'
import MasonryColumns from '../../components/MasonryColumns'
import FilterMultiSelect from '../../components/FilterMultiSelect'
import StatusChip from '../../components/StatusChip'
import type { Commission, Game, GameGroup, GroupCommission, User } from '../../types'

interface UserGroup {
  user_id: number
  user_name: string
  aliases: string[]
  groups: GroupView[]
}

interface GroupView {
  group_id: number | null
  group_name: string
  gcId: number | null
  total: number
  games: Commission[]
  completed: number
  checkedCount: number
}

export default function Commissions() {
  const toast = useToast()
  const confirm = useConfirm()
  const { columns, setColumns } = useColumnCount('ct_commissions_cols')
  const [records, setRecords] = useState<Commission[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [groups, setGroups] = useState<GameGroup[]>([])
  const [groupComms, setGroupComms] = useState<GroupCommission[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState<string[]>([])
  const [gameFilter, setGameFilter] = useState<string[]>([])

  const [gameUser, setGameUser] = useState('')
  const [gameId, setGameId] = useState('')
  const [dueDrafts, setDueDrafts] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cRes, uRes, gRes, grpRes, gcRes, nRes] = await Promise.all([
        apiFetch('/api/admin/commissions'),
        apiFetch('/api/admin/users'),
        apiFetch('/api/admin/games'),
        apiFetch('/api/admin/groups'),
        apiFetch('/api/admin/group-commissions'),
        apiFetch('/api/admin/reminders/notes'),
      ])
      if (!cRes.ok || !uRes.ok || !gRes.ok || !grpRes.ok || !gcRes.ok || !nRes.ok) throw new Error()
      setRecords((await cRes.json()) as Commission[])
      setUsers((await uRes.json()) as User[])
      setGames((await gRes.json()) as Game[])
      setGroups((await grpRes.json()) as GameGroup[])
      setGroupComms((await gcRes.json()) as GroupCommission[])
      const noteMap = (await nRes.json()) as Record<number, string>
      setNotes(noteMap)
      setNoteDrafts((d) => {
        const merged = { ...noteMap }
        for (const k of Object.keys(d)) merged[Number(k)] = d[Number(k)]
        return merged
      })
    } catch {
      toast('加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const aliasMap = useMemo(() => {
    const map = new Map<number, string[]>()
    for (const u of users) map.set(u.id, u.aliases ?? [])
    return map
  }, [users])

  const filteredRecords = useMemo(() => {
    return records.filter(
      (r) =>
        (groupFilter.length === 0 || groupFilter.includes(String(r.group_id))) &&
        (gameFilter.length === 0 || gameFilter.includes(String(r.game_id))),
    )
  }, [records, groupFilter, gameFilter])

  const userGroups = useMemo<UserGroup[]>(() => {
    const byUser = new Map<number, UserGroup>()
    for (const r of filteredRecords) {
      if (!byUser.has(r.user_id)) {
        byUser.set(r.user_id, {
          user_id: r.user_id,
          user_name: r.user_name,
          aliases: aliasMap.get(r.user_id) ?? [],
          groups: [],
        })
      }
      byUser.get(r.user_id)!.groups.push({
        group_id: r.group_id,
        group_name: r.group_name ?? '未分组',
        gcId: null,
        total: 0,
        games: [r],
        completed: 0,
        checkedCount: 0,
      })
    }

    // 将每个用户的组应得并入组视图
    for (const gc of groupComms) {
      const ug = byUser.get(gc.user_id)
      if (!ug) continue
      const gv = ug.groups.find((g) => g.group_id === gc.game_group_id)
      if (gv) {
        gv.gcId = gc.id
        gv.total = gc.total_count
      } else {
        ug.groups.push({
          group_id: gc.game_group_id,
          group_name: gc.group_name,
          gcId: gc.id,
          total: gc.total_count,
          games: [],
          completed: 0,
          checkedCount: 0,
        })
      }
    }

    // 合并同组的游戏行 + 计算聚合
    for (const ug of byUser.values()) {
      const merged = new Map<number | null, GroupView>()
      for (const gv of ug.groups) {
        const key = gv.group_id
        if (!merged.has(key)) {
          merged.set(key, { ...gv, games: [] })
        }
        const target = merged.get(key)!
        target.games.push(...gv.games)
        if (gv.gcId != null) {
          target.gcId = gv.gcId
          target.total = gv.total
        }
      }
      ug.groups = [...merged.values()].sort((a, b) => {
        if (a.group_id == null) return 1
        if (b.group_id == null) return -1
        return a.group_name.localeCompare(b.group_name, 'zh-CN')
      })
      for (const g of ug.groups) {
        g.completed = g.games.reduce((s, r) => s + r.completed_count, 0)
        g.checkedCount = g.games.filter((r) => r.checked_in).length
      }
    }

    return [...byUser.values()].sort((a, b) => a.user_id - b.user_id)
  }, [filteredRecords, groupComms, aliasMap])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = userGroups
    if (q) {
      list = list.filter(
        (g) =>
          String(g.user_id).includes(q) ||
          g.user_name.toLowerCase().includes(q) ||
          g.aliases.some((a) => a.toLowerCase().includes(q)),
      )
    }
    // 筛选游戏/游戏组时，仅保留有匹配游戏记录的用户
    if (groupFilter.length > 0 || gameFilter.length > 0) {
      list = list.filter((ug) => ug.groups.some((g) => g.games.length > 0))
    }
    return list
  }, [userGroups, search, groupFilter, gameFilter])

  const groupedGameOptions = useMemo(() => {
    const byGroup = new Map<string, Game[]>()
    for (const g of games) {
      const key = g.group_id == null ? 'ungrouped' : String(g.group_id)
      if (!byGroup.has(key)) byGroup.set(key, [])
      byGroup.get(key)!.push(g)
    }
    return [...byGroup.values()].sort((a, b) => {
      const an = a[0].group_name ?? '未分组'
      const bn = b[0].group_name ?? '未分组'
      return an.localeCompare(bn, 'zh-CN')
    })
  }, [games])

  const gameFilterOptions = useMemo(() => {
    const scoped = games.filter(
      (g) => groupFilter.length === 0 || groupFilter.includes(String(g.group_id)),
    )
    return [...scoped].sort((a, b) => (a.group_name ?? '未分组').localeCompare(b.group_name ?? '未分组', 'zh-CN'))
  }, [games, groupFilter])

  async function addGame() {
    if (!gameUser.trim()) return toast('请填写用户名', 'error')
    if (!gameId) return toast('请选择游戏', 'error')
    const game = games.find((g) => String(g.id) === gameId)
    const res = await apiFetch('/api/admin/commissions', {
      method: 'POST',
      body: JSON.stringify({ user_name: gameUser.trim(), game_name: game?.name }),
    })
    if (res.ok) {
      setGameUser('')
      setGameId('')
      toast('游戏记录已添加', 'success')
      load()
    } else {
      toast(await readError(res), 'error')
    }
  }

  async function saveDue(ug: UserGroup, gv: GroupView, value: number) {
    if (gv.group_id == null) return
    const res = await apiFetch('/api/admin/group-commissions', {
      method: 'POST',
      body: JSON.stringify({
        user_name: ug.user_name,
        game_group_id: gv.group_id,
        total_count: value,
      }),
    })
    if (res.ok) {
      setDueDrafts((d) => {
        const next = { ...d }
        delete next[`${ug.user_id}:${gv.group_id}`]
        return next
      })
      toast('应得次数已更新', 'success')
      load()
    } else {
      toast(await readError(res), 'error')
    }
  }

  async function checkin(r: Commission) {
    const res = await apiFetch('/api/admin/checkin', {
      method: 'POST',
      body: JSON.stringify({ user_id: r.user_id, game_id: r.game_id, count: 1 }),
    })
    if (!res.ok) return toast(await readError(res), 'error')
    r.completed_count += 1
    r.checked_in = true
    setRecords((list) => [...list])
    toast('打卡成功', 'success')
  }

  async function updateCompleted(r: Commission, value: string) {
    const num = Number(value)
    if (isNaN(num)) return toast('请输入有效数字', 'error')
    const res = await apiFetch(`/api/admin/commissions/${r.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed_count: num }),
    })
    if (res.ok) {
      r.completed_count = num
      setRecords((list) => [...list])
      toast('已完成次数已更新', 'success')
    } else {
      toast(await readError(res), 'error')
    }
  }

  async function saveNote(userId: number) {
    const content = (noteDrafts[userId] ?? '').trim()
    const res = await apiFetch(`/api/admin/reminders/notes/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    })
    if (res.ok) {
      setNotes((d) => {
        const next = { ...d }
        if (content) next[userId] = content
        else delete next[userId]
        return next
      })
      setNoteDrafts((d) => ({ ...d, [userId]: content }))
      toast(content ? '备注已保存' : '备注已清除', 'success')
    } else {
      toast(await readError(res), 'error')
    }
  }

  async function removeGame(r: Commission) {
    const ok = await confirm({
      title: '删除游戏记录',
      message: `确认删除 ${r.user_name} 的「${r.game_name}」已完成记录？`,
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    const res = await apiFetch(`/api/admin/commissions/${r.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast('记录已删除', 'success')
      load()
    } else {
      toast(await readError(res), 'error')
    }
  }

  return (
    <Box>
      <Card sx={{ mb: 2 }}>
        <CardHeader
          title={
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <PlaylistAddIcon color="primary" />
              <span>新增记录</span>
            </Stack>
          }
          titleTypographyProps={{ variant: 'h6' }}
        />
        <CardContent>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              添加游戏记录（已完成跟踪）
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="用户名/别名"
                value={gameUser}
                onChange={(e) => setGameUser(e.target.value)}
                sx={{ flex: 1 }}
              />
              <TextField
                select
                label="选择游戏"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                sx={{ flex: 1 }}
              >
                {groupedGameOptions.map((list) => [
                  <MenuItem key={`h-${list[0].id}`} disabled>
                    {list[0].group_name ?? '未分组'}
                  </MenuItem>,
                  ...list.map((g) => (
                    <MenuItem key={g.id} value={String(g.id)}>
                      {g.name}
                    </MenuItem>
                  )),
                ])}
              </TextField>
              <Button variant="tonal" onClick={addGame} sx={{ alignSelf: 'center' }}>
                添加
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      <Stack
        direction="row"
        spacing={2}
        sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap', rowGap: 1.5 }}
      >
        <TextField
          size="small"
          placeholder="搜索 ID / 用户名 / 别名"
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
        <ColumnCountSelect value={columns} onChange={setColumns} />
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={load}>刷新</Button>
      </Stack>

      {loading && <LinearProgress />}

      <MasonryColumns
        items={filtered}
        columns={columns}
        renderItem={(ug) => (
          <Card>
            <CardHeader
              title={
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="h6">{ug.user_name}</Typography>
                  <Chip label={`#${ug.user_id}`} size="small" variant="outlined" />
                  {ug.aliases.map((a) => (
                    <Chip key={a} label={a} size="small" />
                  ))}
                </Stack>
              }
              subheader={`应得合计 ${ug.groups.reduce((s, g) => s + g.total, 0)} · 已完合计 ${ug.groups.reduce(
                (s, g) => s + g.completed,
                0,
              )} · 已打卡 ${ug.groups.reduce((s, g) => s + g.checkedCount, 0)}/${filteredRecords.filter((r) => r.user_id === ug.user_id).length}`}
            />
            <Divider />
            <CardContent sx={{ px: 0, pb: 0 }}>
              <Box sx={{ p: 2, pb: 1 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <TextField
                    size="small"
                    label="当日备注"
                    value={noteDrafts[ug.user_id] ?? ''}
                    onChange={(e) => setNoteDrafts((d) => ({ ...d, [ug.user_id]: e.target.value }))}
                    sx={{ flex: 1 }}
                  />
                  <Button size="small" variant="tonal" onClick={() => saveNote(ug.user_id)}>
                    保存备注
                  </Button>
                </Stack>
              </Box>
              {ug.groups.map((gv) => {
                const gkey = gv.group_id != null ? `${ug.user_id}:${gv.group_id}` : ''
                return (
                <Box key={gv.group_id ?? 'ungrouped'} sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Stack
                    direction="row"
                    spacing={2}
                    sx={{ mb: 1.5, alignItems: 'center', flexWrap: 'wrap' }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                      {gv.group_name}
                    </Typography>
                    {gv.group_id != null && (
                      <>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            应得
                          </Typography>
                          <TextField
                            type="number"
                            size="small"
                            value={dueDrafts[gkey] ?? gv.total}
                            onChange={(e) =>
                              setDueDrafts((d) => ({ ...d, [gkey]: Number(e.target.value) || 0 }))
                            }
                            onBlur={() => saveDue(ug, gv, dueDrafts[gkey] ?? gv.total)}
                            sx={{ width: 96 }}
                          />
                        </Stack>
                        <Chip label={`已完 ${gv.completed}`} size="small" variant="outlined" />
                        <Chip label={`已打卡 ${gv.checkedCount}/${gv.games.length}`} size="small" />
                      </>
                    )}
                  </Stack>
                  {gv.games.length ? (
                    <TableContainer>
                      <Table size="medium">
                        <TableHead>
                          <TableRow>
                            <TableCell>游戏</TableCell>
                            <TableCell>已完成</TableCell>
                            <TableCell>今日</TableCell>
                            <TableCell>操作</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {gv.games.map((r) => (
                            <TableRow key={r.id} hover>
                              <TableCell>
                                <strong>{r.game_name}</strong>
                              </TableCell>
                              <TableCell>
                                <TextField
                                  type="number"
                                  size="small"
                                  defaultValue={r.completed_count}
                                  sx={{ width: 96 }}
                                  onBlur={(e) => updateCompleted(r, e.target.value)}
                                />
                              </TableCell>
                              <TableCell>
                                <StatusChip checked={r.checked_in} />
                              </TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={1.5}>
                                  <Button variant="tonal" onClick={() => checkin(r)}>
                                    打卡
                                  </Button>
                                  <Button color="error" variant="outlined" onClick={() => removeGame(r)}>
                                    删除
                                  </Button>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      该游戏组下暂无游戏记录
                    </Typography>
                  )}
                </Box>
                )
              })}
            </CardContent>
          </Card>
        )}
      />

      {!loading && filtered.length === 0 && (
        <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
          {search || groupFilter.length > 0 || gameFilter.length > 0 ? '无匹配用户' : '暂无记录'}
        </Typography>
      )}
    </Box>
  )
}
