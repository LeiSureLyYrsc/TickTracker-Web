import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Api } from '@/lib/api'
import { qk } from '@/lib/query'
import type { AdminUser } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { useConfirm } from '@/providers/ConfirmProvider'

export default function AdminUsersPage() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [aliasDrafts, setAliasDrafts] = useState<Record<number, string>>({})

  const { data, isLoading } = useQuery({
    queryKey: qk.admin.users,
    queryFn: () => Api<AdminUser[]>('/api/admin/users'),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: qk.admin.users })

  const addAlias = useMutation({
    mutationFn: (vars: { id: number; alias: string }) =>
      Api(`/api/admin/users/${vars.id}/aliases`, {
        method: 'POST',
        body: JSON.stringify({ alias: vars.alias }),
      }),
    onSuccess: (_d, vars) => {
      toast.success('别名已添加')
      setAliasDrafts((d) => ({ ...d, [vars.id]: '' }))
      invalidate()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '添加失败'),
  })

  async function removeAlias(id: number, alias: string) {
    try {
      await Api(`/api/admin/users/${id}/aliases/${encodeURIComponent(alias)}`, { method: 'DELETE' })
      toast.success('别名已删除')
      invalidate()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    }
  }

  async function removeUser(u: AdminUser) {
    const ok = await confirm({ title: '删除用户', message: `确认删除用户「${u.name}」及其数据？`, confirmText: '删除', danger: true })
    if (!ok) return
    try {
      await Api(`/api/admin/users/${u.id}`, { method: 'DELETE' })
      toast.success('用户已删除')
      invalidate()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    }
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = data ?? []
    if (!q) return list
    return list.filter((u) => String(u.id).includes(q) || u.name.toLowerCase().includes(q) || u.aliases.some((a) => a.toLowerCase().includes(q)))
  }, [data, search])

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="搜索 ID / 用户名 / 别名" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant="tonal" onClick={() => setAddOpen(true)}>
          <Plus />
          新建用户
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : visible.length === 0 ? (
        <Empty title="暂无用户" />
      ) : (
        visible.map((u) => (
          <Card key={u.id}>
            <CardHeader className="flex-row flex-wrap items-center gap-2">
              <CardTitle className="truncate">{u.name}</CardTitle>
              <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">#{u.id}</span>
              {u.role === 'admin' && <Badge>管理员</Badge>}
              {u.login_disabled && <Badge variant="destructive">已停用</Badge>}
              {!u.email_verified && u.email && <Badge variant="muted">邮箱未验证</Badge>}
              <div className="ml-auto flex gap-1">
                <Button variant="outline" size="icon" onClick={() => setEditing(u)} aria-label="编辑">
                  <Pencil />
                </Button>
                <Button variant="outline" size="icon" onClick={() => removeUser(u)} aria-label="删除">
                  <Trash2 />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                <span>QQ：{u.qq_id ?? '未绑定'}</span>
                <span>邮箱：{u.email ?? '未绑定'}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {u.aliases.map((a) => (
                  <span key={a} className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                    {a}
                    <button type="button" onClick={() => removeAlias(u.id, a)} aria-label={`删除别名 ${a}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <Input
                  className="h-8 w-32 text-sm"
                  placeholder="添加别名"
                  value={aliasDrafts[u.id] ?? ''}
                  onChange={(e) => setAliasDrafts((d) => ({ ...d, [u.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (aliasDrafts[u.id] ?? '').trim()) {
                      addAlias.mutate({ id: u.id, alias: aliasDrafts[u.id]!.trim() })
                    }
                  }}
                />
                <Button size="sm" variant="ghost" disabled={!(aliasDrafts[u.id] ?? '').trim()} onClick={() => addAlias.mutate({ id: u.id, alias: aliasDrafts[u.id]!.trim() })}>
                  添加
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <AddUserDialog open={addOpen} onOpenChange={setAddOpen} />
      <EditUserDialog user={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function AddUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const add = useMutation({
    mutationFn: () => Api('/api/admin/users', { method: 'POST', body: JSON.stringify({ name: name.trim() }) }),
    onSuccess: () => {
      toast.success('用户已创建')
      onOpenChange(false)
      setName('')
      qc.invalidateQueries({ queryKey: qk.admin.users })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '创建失败'),
  })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>新建用户</DialogTitle>
          <DialogDescription>创建后可在用户端通过验证码登录</DialogDescription>
        </DialogHeader>
        <div>
          <Label>用户名</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={() => name.trim() && add.mutate()} disabled={add.isPending}>
            {add.isPending ? <Spinner /> : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditUserDialog({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [qq, setQq] = useState('')
  const [email, setEmail] = useState('')
  const [disabled, setDisabled] = useState(false)
  const [moveAlias, setMoveAlias] = useState(false)
  const [ready, setReady] = useState<number | null>(null)

  if (user && ready !== user.id) {
    setName(user.name)
    setQq(user.qq_id != null ? String(user.qq_id) : '')
    setEmail(user.email ?? '')
    setDisabled(user.login_disabled)
    setMoveAlias(false)
    setReady(user.id)
  }

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = { name: name.trim(), login_disabled: disabled, move_old_to_alias: moveAlias }
      if (qq.trim()) body.qq_id = Number(qq.trim())
      body.email = email.trim()
      return Api(`/api/admin/users/${user?.id}`, { method: 'PATCH', body: JSON.stringify(body) })
    },
    onSuccess: () => {
      toast.success('已保存')
      onClose()
      qc.invalidateQueries({ queryKey: qk.admin.users })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '保存失败'),
  })

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>编辑用户</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <Label>用户名</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <label className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={moveAlias} onCheckedChange={setMoveAlias} />
              旧用户名保留为别名
            </label>
          </div>
          <div>
            <Label>QQ 号</Label>
            <Input inputMode="numeric" value={qq} onChange={(e) => setQq(e.target.value)} placeholder="留空表示不修改" />
          </div>
          <div>
            <Label>邮箱</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="修改后自动标记为已验证" />
          </div>
          <label className="flex items-center justify-between gap-2">
            <span className="text-sm">停用 WebUI 登录</span>
            <Switch checked={disabled} onCheckedChange={setDisabled} disabled={user?.role === 'admin'} />
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