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
import IconButton from '@mui/material/IconButton'
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
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import GroupAddIcon from '@mui/icons-material/GroupAdd'
import { apiFetch, readError } from '../../lib/api'
import { useToast } from '../../lib/toast'
import { useConfirm } from '../../lib/confirm'
import { useColumnCount } from '../../lib/columns'
import ColumnCountSelect from '../../components/ColumnCountSelect'
import MasonryColumns from '../../components/MasonryColumns'
import AliasDialog, { type AliasTarget } from '../../components/AliasDialog'
import type { Game, GameGroup } from '../../types'

function formatDate(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString() : '-'
}

export default function Games() {
  const toast = useToast()
  const confirm = useConfirm()
  const { columns, setColumns } = useColumnCount('ct_games_cols')
  const [groups, setGroups] = useState<GameGroup[]>([])
  const [ungrouped, setUngrouped] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [gameDrafts, setGameDrafts] = useState<Record<number, string>>({})
  const [rename, setRename] = useState<{ open: boolean; group: GameGroup | null; name: string }>({
    open: false,
    group: null,
    name: '',
  })
  const [alias, setAlias] = useState<{ open: boolean; target: AliasTarget | null }>({
    open: false,
    target: null,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [gRes, gameRes] = await Promise.all([
        apiFetch('/api/admin/groups'),
        apiFetch('/api/admin/games'),
      ])
      if (!gRes.ok || !gameRes.ok) throw new Error()
      const groupList = (await gRes.json()) as GameGroup[]
      const allGames = (await gameRes.json()) as Game[]
      setGroups(groupList)
      setUngrouped(allGames.filter((g) => !g.group_id))
    } catch {
      toast('加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  async function createGroup() {
    const name = newGroupName.trim()
    if (!name) return toast('请输入游戏组名称', 'error')
    const res = await apiFetch('/api/admin/groups', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      setNewGroupName('')
      toast('游戏组已创建', 'success')
      load()
    } else {
      toast(await readError(res), 'error')
    }
  }

  async function renameGroup() {
    if (!rename.group) return
    const name = rename.name.trim()
    if (!name) return toast('请输入游戏组名称', 'error')
    const res = await apiFetch(`/api/admin/groups/${rename.group.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      toast('游戏组已改名', 'success')
      setRename({ open: false, group: null, name: '' })
      load()
    } else {
      toast(await readError(res), 'error')
    }
  }

  async function deleteGroup(g: GameGroup) {
    const ok = await confirm({
      title: '删除游戏组',
      message: `确认删除游戏组「${g.name}」？组内游戏将变为未分组。`,
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    const res = await apiFetch(`/api/admin/groups/${g.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast('游戏组已删除', 'success')
      load()
    } else {
      toast(await readError(res), 'error')
    }
  }

  async function addGame(groupId: number) {
    const name = (gameDrafts[groupId] ?? '').trim()
    if (!name) return toast('请输入游戏名', 'error')
    const res = await apiFetch('/api/admin/games', {
      method: 'POST',
      body: JSON.stringify({ name, group_id: groupId }),
    })
    if (res.ok) {
      setGameDrafts((d) => ({ ...d, [groupId]: '' }))
      toast('游戏已创建', 'success')
      load()
    } else {
      toast(await readError(res), 'error')
    }
  }

  async function deleteGame(game: Game) {
    const ok = await confirm({
      title: '删除游戏',
      message: `确认删除游戏「${game.name}」？`,
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    const res = await apiFetch(`/api/admin/games/${game.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast('游戏已删除', 'success')
      load()
    } else {
      toast(await readError(res), 'error')
    }
  }

  function renderGameRow(game: Game) {
    return (
      <TableRow key={game.id} hover>
        <TableCell>
          <strong>{game.name}</strong>
        </TableCell>
        <TableCell>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {(game.aliases ?? []).map((a) => (
              <Chip key={a} label={a} size="small" />
            ))}
          </Stack>
        </TableCell>
        <TableCell>{formatDate(game.created_at)}</TableCell>
        <TableCell>
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={() => manageAliases(game)}>
              别名
            </Button>
            <IconButton
              size="small"
              color="error"
              aria-label="删除"
              onClick={() => deleteGame(game)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        </TableCell>
      </TableRow>
    )
  }

  function manageAliases(game: Game) {
    setAlias({ open: true, target: { type: 'game', id: game.id, name: game.name, aliases: game.aliases ?? [] } })
  }

  function renderGroupCard(g: GameGroup) {
    return (
      <Card>
        <CardHeader
          title={
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="h6">{g.name}</Typography>
              <Chip label={`${g.games?.length ?? 0} 个游戏`} size="small" />
            </Stack>
          }
          action={
            <Stack direction="row" spacing={0.5}>
              <IconButton aria-label="改名" onClick={() => setRename({ open: true, group: g, name: g.name })}>
                <EditIcon />
              </IconButton>
              <IconButton aria-label="删除组" color="error" onClick={() => deleteGroup(g)}>
                <DeleteIcon />
              </IconButton>
            </Stack>
          }
        />
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <TextField
              label="新游戏名"
              value={gameDrafts[g.id] ?? ''}
              onChange={(e) => setGameDrafts((d) => ({ ...d, [g.id]: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && addGame(g.id)}
              sx={{ flex: 1, maxWidth: { sm: 320 } }}
            />
            <Button variant="tonal" startIcon={<AddIcon />} onClick={() => addGame(g.id)} sx={{ alignSelf: 'center' }}>
              添加游戏
            </Button>
          </Stack>

          {(g.games ?? []).length ? (
            <TableContainer>
              <Table size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell>游戏名</TableCell>
                    <TableCell>别名</TableCell>
                    <TableCell>创建时间</TableCell>
                    <TableCell>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>{g.games!.map(renderGameRow)}</TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
              组内暂无游戏
            </Typography>
          )}
        </CardContent>
      </Card>
    )
  }

  function renderUngroupedCard() {
    return (
      <Card>
        <CardHeader
          title={
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="h6">未分组</Typography>
              <Chip label={`${ungrouped.length} 个游戏`} size="small" />
            </Stack>
          }
        />
        <CardContent>
          <TableContainer>
            <Table size="medium">
              <TableHead>
                <TableRow>
                  <TableCell>游戏名</TableCell>
                  <TableCell>别名</TableCell>
                  <TableCell>创建时间</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>{ungrouped.map(renderGameRow)}</TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    )
  }

  const masonryItems = useMemo(() => {
    const items: Array<{ type: 'group'; group: GameGroup } | { type: 'ungrouped' }> = groups.map(
      (g) => ({ type: 'group' as const, group: g }),
    )
    if (ungrouped.length) items.push({ type: 'ungrouped' as const })
    return items
  }, [groups, ungrouped])

  return (
    <Box>
      <Card sx={{ mb: 2 }}>
        <CardHeader
          title={
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <GroupAddIcon color="primary" />
              <span>创建游戏组</span>
            </Stack>
          }
          titleTypographyProps={{ variant: 'h6' }}
        />
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="游戏组名称"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createGroup()}
              sx={{ flex: 1, maxWidth: { sm: 320 } }}
            />
            <Button variant="contained" onClick={createGroup} sx={{ alignSelf: 'center' }}>
              创建
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {loading && <LinearProgress />}

      <Stack
        direction="row"
        spacing={2}
        sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap', rowGap: 1.5 }}
      >
        <Box sx={{ flexGrow: 1 }} />
        <ColumnCountSelect value={columns} onChange={setColumns} />
        <Button onClick={load}>刷新</Button>
      </Stack>

      <MasonryColumns
        items={masonryItems}
        columns={columns}
        renderItem={(item) =>
          item.type === 'group' ? renderGroupCard(item.group) : renderUngroupedCard()
        }
      />

      <Dialog
        open={rename.open}
        onClose={() => setRename({ open: false, group: null, name: '' })}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>修改游戏组名称</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="游戏组名称"
            value={rename.name}
            onChange={(e) => setRename({ ...rename, name: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && renameGroup()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRename({ open: false, group: null, name: '' })}>取消</Button>
          <Button variant="contained" onClick={renameGroup}>
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
