import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FolderPlus, Gamepad2, Pencil, Plus, Settings2, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Api } from '@/lib/api'
import { qk } from '@/lib/query'
import type { Game, GameGroup, GameGroupGame } from '@/lib/types'
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
import { useConfirm } from '@/providers/ConfirmProvider'

const UNGROUPED = 'ungrouped'

export default function AdminGamesPage() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [groupOpen, setGroupOpen] = useState(false)
  const [gameOpen, setGameOpen] = useState(false)
  const [renaming, setRenaming] = useState<GameGroup | null>(null)
  const [managing, setManaging] = useState<{ id: number; name: string; aliases: string[] } | null>(null)

  const { data: groups = [], isLoading } = useQuery({
    queryKey: qk.admin.groups,
    queryFn: () => Api<GameGroup[]>('/api/admin/groups'),
  })
  const { data: allGames = [] } = useQuery({
    queryKey: qk.admin.games,
    queryFn: () => Api<Game[]>('/api/admin/games'),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: qk.admin.groups })
    qc.invalidateQueries({ queryKey: qk.admin.games })
  }

  const ungrouped = useMemo<GameGroupGame[]>(
    () =>
      allGames
        .filter((g) => g.group_id == null)
        .map((g) => ({ id: g.id, name: g.name, created_at: g.created_at ?? '', aliases: g.aliases ?? [] })),
    [allGames],
  )

  function groupCard(name: string, games: GameGroupGame[], group: GameGroup | null) {
    return (
      <Card key={group?.id ?? 'ungrouped'}>
        <CardHeader className="flex-row items-center gap-2">
          <FolderPlus className="h-5 w-5 text-primary" />
          <CardTitle className="truncate">{name}</CardTitle>
          {group && (
            <div className="ml-auto flex gap-1">
              <Button variant="outline" size="icon" onClick={() => setRenaming(group)} aria-label="改名">
                <Pencil />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="删除"
                onClick={async () => {
                  const ok = await confirm({ title: '删除游戏组', message: `删除「${group.name}」？组内游戏将变为未分组。`, confirmText: '删除', danger: true })
                  if (!ok) return
                  try {
                    await Api(`/api/admin/groups/${group.id}`, { method: 'DELETE' })
                    toast.success('游戏组已删除')
                    invalidate()
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : '删除失败')
                  }
                }}
              >
                <Trash2 />
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {games.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">暂无游戏</p>
          ) : (
            games.map((g) => (
              <div key={g.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <Gamepad2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{g.name}</span>
                {g.aliases.map((a) => (
                  <span key={a} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {a}
                  </span>
                ))}
                <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setManaging({ id: g.id, name: g.name, aliases: g.aliases })}>
                  <Settings2 />
                  管理
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="tonal" onClick={() => setGroupOpen(true)}>
          <FolderPlus />
          新建游戏组
        </Button>
        <Button variant="tonal" onClick={() => setGameOpen(true)}>
          <Plus />
          新建游戏
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <>
          {groups.length === 0 && ungrouped.length === 0 ? (
            <Empty title="暂无游戏" icon={<Gamepad2 className="h-8 w-8" />} />
          ) : (
            <>
              {groups.map((grp) => groupCard(grp.name, grp.games ?? [], grp))}
              {ungrouped.length > 0 && groupCard('未分组', ungrouped, null)}
            </>
          )}
        </>
      )}

      <CreateGroupDialog open={groupOpen} onOpenChange={setGroupOpen} />
      <RenameGroupDialog group={renaming} onClose={() => setRenaming(null)} />
      <CreateGameDialog open={gameOpen} onOpenChange={setGameOpen} groups={groups} />
      <ManageGameDialog game={managing} onClose={() => setManaging(null)} groups={groups} />
    </div>
  )
}

function CreateGroupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const create = useMutation({
    mutationFn: () => Api('/api/admin/groups', { method: 'POST', body: JSON.stringify({ name: name.trim() }) }),
    onSuccess: () => {
      toast.success('游戏组已创建')
      onOpenChange(false)
      setName('')
      qc.invalidateQueries({ queryKey: qk.admin.groups })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '创建失败'),
  })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>新建游戏组</DialogTitle>
        </DialogHeader>
        <div>
          <Label>名称</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={() => name.trim() && create.mutate()} disabled={create.isPending}>
            {create.isPending ? <Spinner /> : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RenameGroupDialog({ group, onClose }: { group: GameGroup | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [ready, setReady] = useState<number | null>(null)
  if (group && ready !== group.id) {
    setName(group.name)
    setReady(group.id)
  }
  const save = useMutation({
    mutationFn: () => Api(`/api/admin/groups/${group?.id}`, { method: 'PATCH', body: JSON.stringify({ name: name.trim() }) }),
    onSuccess: () => {
      toast.success('已改名')
      onClose()
      qc.invalidateQueries({ queryKey: qk.admin.groups })
      qc.invalidateQueries({ queryKey: qk.admin.games })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '保存失败'),
  })
  return (
    <Dialog open={!!group} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>游戏组改名</DialogTitle>
        </DialogHeader>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button onClick={() => name.trim() && save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Spinner /> : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateGameDialog({ open, onOpenChange, groups }: { open: boolean; onOpenChange: (v: boolean) => void; groups: GameGroup[] }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [groupId, setGroupId] = useState(UNGROUPED)
  const create = useMutation({
    mutationFn: () =>
      Api('/api/admin/games', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), group_id: groupId === UNGROUPED ? null : Number(groupId) }),
      }),
    onSuccess: () => {
      toast.success('游戏已创建')
      onOpenChange(false)
      setName('')
      setGroupId(UNGROUPED)
      qc.invalidateQueries({ queryKey: qk.admin.groups })
      qc.invalidateQueries({ queryKey: qk.admin.games })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '创建失败'),
  })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>新建游戏</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <Label>名称</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>所属游戏组</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNGROUPED}>未分组</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={() => name.trim() && create.mutate()} disabled={create.isPending}>
            {create.isPending ? <Spinner /> : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ManageGameDialog({
  game,
  onClose,
  groups,
}: {
  game: { id: number; name: string; aliases: string[] } | null
  onClose: () => void
  groups: GameGroup[]
}) {
  const qc = useQueryClient()
  const [groupId, setGroupId] = useState(UNGROUPED)
  const [ready, setReady] = useState<number | null>(null)
  const [alias, setAlias] = useState('')

  if (game && ready !== game.id) {
    const current = groups.find((g) => (g.games ?? []).some((x) => x.id === game.id))
    setGroupId(current ? String(current.id) : UNGROUPED)
    setAlias('')
    setReady(game.id)
  }

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: qk.admin.groups })
    qc.invalidateQueries({ queryKey: qk.admin.games })
  }

  const move = useMutation({
    mutationFn: () =>
      Api(`/api/admin/games/${game?.id}`, { method: 'PATCH', body: JSON.stringify({ group_id: groupId === UNGROUPED ? null : Number(groupId) }) }),
    onSuccess: () => {
      toast.success('已移动')
      invalidate()
      onClose()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '移动失败'),
  })

  const addAlias = useMutation({
    mutationFn: () => Api(`/api/admin/games/${game?.id}/aliases`, { method: 'POST', body: JSON.stringify({ alias: alias.trim() }) }),
    onSuccess: () => {
      toast.success('别名已添加')
      setAlias('')
      invalidate()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '添加失败'),
  })

  async function removeAlias(a: string) {
    try {
      await Api(`/api/admin/games/${game?.id}/aliases/${encodeURIComponent(a)}`, { method: 'DELETE' })
      toast.success('别名已删除')
      invalidate()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    }
  }

  async function deleteGame() {
    try {
      await Api(`/api/admin/games/${game?.id}`, { method: 'DELETE' })
      toast.success('游戏已删除')
      invalidate()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    }
  }

  return (
    <Dialog open={!!game} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>管理「{game?.name}」</DialogTitle>
          <DialogDescription>移动分组、管理别名</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <Label>所属游戏组</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNGROUPED}>未分组</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="mt-2" variant="tonal" size="sm" onClick={() => move.mutate()} disabled={move.isPending}>
              移动
            </Button>
          </div>
          <div>
            <Label>别名</Label>
            <div className="mb-2 flex flex-wrap gap-2">
              {(game?.aliases ?? []).map((a) => (
                <span key={a} className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                  {a}
                  <button type="button" onClick={() => removeAlias(a)} aria-label={`删除别名 ${a}`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="新增别名" />
              <Button variant="tonal" onClick={() => alias.trim() && addAlias.mutate()} disabled={addAlias.isPending}>
                添加
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="destructive" onClick={deleteGame}>
            <Trash2 />
            删除游戏
          </Button>
          <Button variant="ghost" onClick={onClose}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}