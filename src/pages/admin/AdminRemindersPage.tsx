import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BellPlus, RotateCcw, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Api } from '@/lib/api'
import { qk } from '@/lib/query'
import type { ReminderSetting } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
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
import { Textarea } from '@/components/ui/textarea'
import { useConfirm } from '@/providers/ConfirmProvider'

export default function AdminRemindersPage() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [addOpen, setAddOpen] = useState(false)

  const { data = [], isLoading } = useQuery({
    queryKey: qk.admin.reminders,
    queryFn: () => Api<ReminderSetting[]>('/api/admin/reminders'),
  })
  const { data: templateData } = useQuery({
    queryKey: qk.admin.template,
    queryFn: () => Api<{ template: string }>('/api/admin/reminders/template'),
  })

  const [template, setTemplate] = useState('')
  useEffect(() => {
    if (templateData) setTemplate(templateData.template)
  }, [templateData])

  const patch = useMutation({
    mutationFn: (vars: { userId: number; enabled?: boolean; push_time?: string }) =>
      Api(`/api/admin/reminders/${vars.userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: vars.enabled, push_time: vars.push_time }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.admin.reminders }),
    onError: (e) => toast.error(e instanceof Error ? e.message : '保存失败'),
  })

  const saveTemplate = useMutation({
    mutationFn: () => Api<{ template: string }>('/api/admin/reminders/template', { method: 'PUT', body: JSON.stringify({ template }) }),
    onSuccess: (d) => {
      toast.success('模板已保存')
      qc.setQueryData(qk.admin.template, d)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '保存失败'),
  })

  const resetTemplate = useMutation({
    mutationFn: () => Api<{ template: string }>('/api/admin/reminders/template/reset', { method: 'POST' }),
    onSuccess: (d) => {
      toast.success('已重置为默认模板')
      setTemplate(d.template)
      qc.setQueryData(qk.admin.template, d)
    },
  })

  async function remove(r: ReminderSetting) {
    const ok = await confirm({ title: '删除提醒', message: `删除 ${r.user_name} 的提醒设置？`, confirmText: '删除', danger: true })
    if (!ok) return
    try {
      await Api(`/api/admin/reminders/${r.user_id}`, { method: 'DELETE' })
      toast.success('已删除')
      qc.invalidateQueries({ queryKey: qk.admin.reminders })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3">
      <Card>
        <CardHeader>
          <CardTitle>推送模板</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Textarea value={template} onChange={(e) => setTemplate(e.target.value)} rows={5} />
          <p className="text-xs text-muted-foreground">
            可用占位符：{'{name}'} {'{done}'} {'{total}'} {'{groups}'} {'{list}'} {'{note}'}
          </p>
          <div className="flex gap-2">
            <Button variant="tonal" onClick={() => saveTemplate.mutate()} disabled={saveTemplate.isPending}>
              <Save />
              保存模板
            </Button>
            <Button variant="outline" onClick={() => resetTemplate.mutate()}>
              <RotateCcw />
              恢复默认
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="px-1 text-sm font-medium text-muted-foreground">用户提醒（{data.length}）</h3>
        <Button variant="tonal" size="sm" onClick={() => setAddOpen(true)}>
          <BellPlus />
          添加/修改
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : data.length === 0 ? (
        <Empty title="暂无提醒设置" />
      ) : (
        data.map((r) => (
          <Card key={r.user_id}>
            <CardContent className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-32">
                <p className="font-medium">{r.user_name}</p>
                <p className="text-xs text-muted-foreground">QQ {r.qq_id ?? '未绑定'}</p>
              </div>
              <Input
                type="time"
                className="w-32"
                defaultValue={r.push_time}
                onBlur={(e) => e.target.value !== r.push_time && patch.mutate({ userId: r.user_id, push_time: e.target.value })}
              />
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={r.enabled} onCheckedChange={(v) => patch.mutate({ userId: r.user_id, enabled: v })} />
                启用
              </label>
              <Button variant="outline" size="icon" className="ml-auto" onClick={() => remove(r)} aria-label="删除">
                <Trash2 />
              </Button>
            </CardContent>
          </Card>
        ))
      )}

      <AddReminderDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}

function AddReminderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient()
  const [userName, setUserName] = useState('')
  const [time, setTime] = useState('22:00')
  const add = useMutation({
    mutationFn: () =>
      Api('/api/admin/reminders', {
        method: 'POST',
        body: JSON.stringify({ user_name: userName.trim(), push_time: time, enabled: true }),
      }),
    onSuccess: () => {
      toast.success('已保存')
      onOpenChange(false)
      setUserName('')
      qc.invalidateQueries({ queryKey: qk.admin.reminders })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '保存失败'),
  })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>添加/修改提醒</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <Label>用户名 / 别名</Label>
            <Input value={userName} onChange={(e) => setUserName(e.target.value)} />
          </div>
          <div>
            <Label>推送时间</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={() => userName.trim() && add.mutate()} disabled={add.isPending}>
            {add.isPending ? <Spinner /> : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}