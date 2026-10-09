import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { NotebookPen, Pencil, Plus, RefreshCw, Search, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Api } from '@/lib/api'
import { qk } from '@/lib/query'
import type { AdminUser, Commission, Game, GameGroup, GroupCommission } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Empty } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { CheckinButton } from '@/components/common/CheckinButton'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useConfirm } from '@/providers/ConfirmProvider'

const ALL = 'all'

interface GroupView {
  key: string
  group_id: number | null
  group_name: string
  total: number | null
  games: Commission[]
}

interface UserView {
  user_id: number
  user_name: string
  aliases: string[]
  groups: GroupView[]
  gamesCount: number
  checkedCount: number
}

export default function AdminCommissionsPage() {
  const qc = useQueryClient()
  const confirm = useConfirm()

  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState(ALL)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<Commission | null>(null)
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({})

  const { data: commissions, isLoading } = useQuery({
    queryKey: qk.admin.commissions,
    queryFn: () => Api<Commission[]>('/api/admin/commissions'),
  })
  const { data: users = [] } = useQuery({
    queryKey: qk.admin.users,
    queryFn: () => Api<AdminUser[]>('/api/admin/users'),
  })
  const { data: games = [] } = useQuery({
    queryKey: qk.admin.games,
    queryFn: () => Api<Game[]>('/api/admin/games'),
  })
  const { data: groups = [] } = useQuery({
    queryKey: qk.admin.groups,
    queryFn: () => Api<GameGroup[]>('/api/admin/groups'),
  })
  const { data: groupComms = [] } = useQuery({
    queryKey: qk.admin.groupCommissions,
    queryFn: () => Api<GroupCommission[]>('/api/admin/group-commissions'),
  })
  const { data: notes = {} } = useQuery({
    queryKey: qk.admin.notes,
    queryFn: () => Api<Record<string, string>>('/api/admin/reminders/notes'),
  })

  const checkin = useMutation({
    mutationFn: (vars: { userId: number; gameId: number }) =>
      Api('/api/admin/checkin', {
        method: 'POST',
        body: JSON.stringify({ user_id: vars.userId, game_id: vars.gameId, count: 1 }),
      }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: qk.admin.commissions })
      const prev = qc.getQueryData<Commission[]>(qk.admin.commissions)
      qc.setQueryData<Commission[]>(qk.admin.commissions, (old) =>
        old?.map((c) =>
          c.user_id === vars.userId && c.game_id === vars.gameId
            ? { ...c, completed_count: c.completed_count + 1, checked_in: true, last_checked_in_at: new Date().toISOString() }
            : c,
        ),
      )
      return { prev }
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.admin.commissions, ctx.prev)
      toast.error(e instanceof Error ? e.message : '打卡失败')
    },
    onSuccess: () => toast.success('打卡成功'),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.admin.commissions })
      qc.invalidateQueries({ queryKey: qk.user.commissions })
      qc.invalidateQueries({ queryKey: qk.user.progress })
    },
  })

  const saveNote = useMutation({
    mutationFn: (vars: { userId: number; content: string }) =>
      Api(`/api/admin/reminders/notes/${vars.userId}`, {
        method: 'PUT',
        body: JSON.stringify({ content: vars.content }),
      }),
    onSuccess: (_d, vars) => {
      toast.success(vars.content ? '备注已保存' : '备注已清除')
      qc.setQueryData<Record<string, string>>(qk.admin.notes, (old) => {
        const next = { ...(old ?? {}) }
        if (vars.content) next[String(vars.userId)] = vars.content
        else delete next[String(vars.userId)]
        return next
      })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '保存失败'),
  })

  async function removeGame(r: Commission) {
    const ok = await confirm({
      title: '删除游戏记录',
      message: `确认删除 ${r.user_name} 的「${r.game_name}」记录？`,
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    try {
      await Api(`/api/admin/commissions/${r.id}`, { method: 'DELETE' })
      toast.success('记录已删除')
      qc.invalidateQueries({ queryKey: qk.admin.commissions })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    }
  }

  const aliasMap = useMemo(() => {
    const map = new Map<number, string[]>()
    for (const u of users) map.set(u.id, u.aliases ?? [])
    return map
  }, [users])

  const views = useMemo<UserView[]>(() => {
    const byUser = new Map<number, UserView>()
    const gf = groupFilter === ALL ? null : Number(groupFilter)

    for (const c of commissions ?? []) {
      if (gf !== null && c.group_id !== gf) continue
      let uv = byUser.get(c.user_id)
      if (!uv) {
        uv = { user_id: c.user_id, user_name: c.user_name, aliases: aliasMap.get(c.user_id) ?? [], groups: [], gamesCount: 0, checkedCount: 0 }
        byUser.set(c.user_id, uv)
      }
      const gkey = c.group_id == null ? 'ungrouped' : String(c.group_id)
      let gv = uv.groups.find((g) => g.key === gkey)
      if (!gv) {
        gv = { key: gkey, group_id: c.group_id, group_name: c.group_name ?? '未分组', total: null, games: [] }
        uv.groups.push(gv)
      }
      gv.games.push(c)
      uv.gamesCount += 1
      if (c.checked_in) uv.checkedCount += 1
    }

    for (const gc of groupComms ?? []) {
      const uv = byUser.get(gc.user_id)
      if (!uv) continue
      const gv = uv.groups.find((g) => g.group_id === gc.game_group_id)
      if (gv) gv.total = gc.total_count
    }

    for (const uv of byUser.values()) {
      uv.groups.sort((a, b) => a.group_name.localeCompare(b.group_name, 'zh-CN'))
    }
    return [...byUser.values()].sort((a, b) => a.user_id - b.user_id)
  }, [commissions, groupComms, aliasMap, groupFilter])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return views
    return views.filter(
      (v) =>
        String(v.user_id).includes(q) ||
        v.user_name.toLowerCase().includes(q) ||
        v.aliases.some((a) => a.toLowerCase().includes(q)),
    )
  }, [views, search])

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="搜索 ID / 用户名 / 别名"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="游戏组" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>全部游戏组</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={String(g.id)}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="tonal" onClick={() => setAddOpen(true)}>
          <Plus />
          新增
        </Button>
        <Button variant="ghost" size="icon" onClick={() => qc.invalidateQueries({ queryKey: qk.admin.commissions })} aria-label="刷新">
          <RefreshCw />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Empty title={search ? '无匹配用户' : '暂无记录'} icon={<Users className="h-8 w-8" />} />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((v) => (
            <Card key={v.user_id}>
              <CardHeader className="gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="truncate">{v.user_name}</CardTitle>
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">#{v.user_id}</span>
                  {v.aliases.map((a) => (
                    <span key={a} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{a}</span>
                  ))}
                  <span className="ml-auto text-xs text-muted-foreground">
                    已打卡 {v.checkedCount}/{v.gamesCount}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <NotebookPen className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Input
                    placeholder="当日备注"
                    value={noteDrafts[v.user_id] ?? notes[String(v.user_id)] ?? ''}
                    onChange={(e) => setNoteDrafts((d) => ({ ...d, [v.user_id]: e.target.value }))}
                  />
                  <Button
                    size="sm"
                    variant="tonal"
                    onClick={() =>
                      saveNote.mutate({
                        userId: v.user_id,
                        content: (noteDrafts[v.user_id] ?? notes[String(v.user_id)] ?? '').trim(),
                      })
                    }
                  >
                    保存
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {v.groups.map((g) => {
                  const completed = g.games.reduce((s, r) => s + r.completed_count, 0)
                  const checked = g.games.filter((r) => r.checked_in).length
                  return (
                    <div key={g.key} className="rounded-xl border border-border p-3">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="font-medium">{g.group_name}</span>
                        {g.total != null && (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">应得 {g.total}</span>
                        )}
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">已完 {completed}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">已打卡 {checked}/{g.games.length}</span>
                      </div>
                      <div className="flex flex-col divide-y divide-border">
                        {g.games.map((r) => (
                          <div key={r.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{r.game_name}</p>
                              <p className="text-xs text-muted-foreground">已完成 {r.completed_count}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusBadge checked={r.checked_in} />
                              <CheckinButton
                                checked={r.checked_in}
                                pending={checkin.isPending && checkin.variables?.gameId === r.game_id && checkin.variables?.userId === r.user_id}
                                onClick={() => checkin.mutate({ userId: r.user_id, gameId: r.game_id })}
                                className="flex-1 sm:flex-none"
                              />
                              <Button variant="outline" size="icon" onClick={() => setEditing(r)} aria-label="修改">
                                <Pencil />
                              </Button>
                              <Button variant="outline" size="icon" onClick={() => removeGame(r)} aria-label="删除">
                                <Trash2 />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddRecordDialog open={addOpen} onOpenChange={setAddOpen} games={games} />
      <EditRecordDialog record={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function AddRecordDialog({
  open,
  onOpenChange,
  games,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  games: Game[]
}) {
  const qc = useQueryClient()
  const [userName, setUserName] = useState('')
  const [gameId, setGameId] = useState('')

  const add = useMutation({
    mutationFn: () => {
      const g = games.find((x) => String(x.id) === gameId)
      return Api('/api/admin/commissions', {
        method: 'POST',
        body: JSON.stringify({ user_name: userName.trim(), game_name: g?.name }),
      })
    },
    onSuccess: () => {
      toast.success('记录已添加')
      onOpenChange(false)
      setUserName('')
      setGameId('')
      qc.invalidateQueries({ queryKey: qk.admin.commissions })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '添加失败'),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>新增代肝记录（已完成跟踪）</DialogTitle>
          <DialogDescription>用户名支持名称或别名</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <Label>用户名 / 别名</Label>
            <Input value={userName} onChange={(e) => setUserName(e.target.value)} />
          </div>
          <div>
            <Label>选择游戏</Label>
            <Select value={gameId} onValueChange={setGameId}>
              <SelectTrigger>
                <SelectValue placeholder="请选择游戏" />
              </SelectTrigger>
              <SelectContent>
                {games.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    {g.group_name ? `${g.group_name} / ${g.name}` : g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
          <Button
            onClick={() => {
              if (!userName.trim()) return toast.error('请填写用户名')
              if (!gameId) return toast.error('请选择游戏')
              add.mutate()
            }}
            disabled={add.isPending}
          >
            {add.isPending ? <Spinner /> : '添加'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditRecordDialog({ record, onClose }: { record: Commission | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [count, setCount] = useState(0)
  const [checked, setChecked] = useState(false)
  const [ready, setReady] = useState<number | null>(null)

  if (record && ready !== record.id) {
    setCount(record.completed_count)
    setChecked(record.checked_in)
    setReady(record.id)
  }

  const save = useMutation({
    mutationFn: () =>
      Api(`/api/admin/commissions/${record?.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed_count: count, checked_in: checked }),
      }),
    onSuccess: () => {
      toast.success('已保存')
      onClose()
      qc.invalidateQueries({ queryKey: qk.admin.commissions })
      qc.invalidateQueries({ queryKey: qk.user.commissions })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '保存失败'),
  })

  return (
    <Dialog open={!!record} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>修改「{record?.game_name}」</DialogTitle>
          <DialogDescription>{record?.user_name}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <Label>已完成次数</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={count}
              onChange={(e) => setCount(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
          <label className="flex items-center justify-between gap-2">
            <span className="text-sm">今日已打卡</span>
            <Switch checked={checked} onCheckedChange={setChecked} />
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Spinner /> : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}