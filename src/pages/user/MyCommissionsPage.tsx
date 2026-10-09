import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FolderOpen, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Api } from '@/lib/api'
import { qk } from '@/lib/query'
import { formatDateTime } from '@/lib/utils'
import type { GroupDue, MyCommission } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckinButton } from '@/components/common/CheckinButton'
import { Empty } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/common/StatusBadge'

interface GroupView {
  key: string
  name: string
  total: number | null
  games: MyCommission[]
}

export default function MyCommissionsPage() {
  const qc = useQueryClient()

  const { data: commissions, isLoading } = useQuery({
    queryKey: qk.user.commissions,
    queryFn: () => Api<MyCommission[]>('/api/user/me/commissions'),
  })
  const { data: dues } = useQuery({
    queryKey: qk.user.groupCommissions,
    queryFn: () => Api<GroupDue[]>('/api/user/me/group-commissions'),
  })
  const { data: note } = useQuery({
    queryKey: qk.user.note,
    queryFn: () => Api<{ content: string }>('/api/user/me/note'),
  })

  const checkin = useMutation({
    mutationFn: (gameId: number) =>
      Api('/api/user/me/checkin', {
        method: 'POST',
        body: JSON.stringify({ game_id: gameId, count: 1 }),
      }),
    onMutate: async (gameId) => {
      await qc.cancelQueries({ queryKey: qk.user.commissions })
      const prev = qc.getQueryData<MyCommission[]>(qk.user.commissions)
      qc.setQueryData<MyCommission[]>(qk.user.commissions, (old) =>
        old?.map((c) =>
          c.game_id === gameId
            ? {
                ...c,
                completed_count: c.completed_count + 1,
                checked_in: true,
                last_checked_in_at: new Date().toISOString(),
              }
            : c,
        ),
      )
      return { prev }
    },
    onError: (e, _gameId, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.user.commissions, ctx.prev)
      toast.error(e instanceof Error ? e.message : '打卡失败')
    },
    onSuccess: () => toast.success('打卡成功'),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.user.commissions })
      qc.invalidateQueries({ queryKey: qk.user.progress })
      qc.invalidateQueries({ queryKey: qk.admin.commissions })
    },
  })

  const groups = useMemo<GroupView[]>(() => {
    const map = new Map<string, GroupView>()
    for (const c of commissions ?? []) {
      const key = c.group_id == null ? 'ungrouped' : String(c.group_id)
      if (!map.has(key)) {
        map.set(key, { key, name: c.group_name ?? '未分组', total: null, games: [] })
      }
      map.get(key)!.games.push(c)
    }
    for (const d of dues ?? []) {
      const g = map.get(String(d.game_group_id))
      if (g) g.total = d.total_count
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  }, [commissions, dues])

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-3">
      {note?.content && (
        <div className="rounded-2xl border border-primary/40 bg-secondary p-4 text-secondary-foreground">
          <p className="mb-1 text-sm font-semibold">今日备注</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{note.content}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">共 {groups.length} 个游戏组</span>
        <Button variant="ghost" size="sm" onClick={() => qc.invalidateQueries({ queryKey: qk.user.root })}>
          <RefreshCw />
          刷新
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : groups.length === 0 ? (
        <Empty title="暂无代肝记录" hint="请联系管理员为你的账号添加游戏" icon={<FolderOpen className="h-8 w-8" />} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {groups.map((g) => (
            <Card key={g.key}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 truncate">
                  <FolderOpen className="h-5 w-5 shrink-0 text-primary" />
                  <span className="truncate">{g.name}</span>
                </CardTitle>
                {g.total != null && (
                  <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                    应得 {g.total}
                  </span>
                )}
              </CardHeader>
              <CardContent className="flex flex-col divide-y divide-border">
                {g.games.map((c) => (
                  <div key={c.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.game_name}</p>
                      <p className="text-xs text-muted-foreground">
                        已完成 {c.completed_count}
                        {c.last_checked_in_at ? ` · 最后 ${formatDateTime(c.last_checked_in_at)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <StatusBadge checked={c.checked_in} />
                      <CheckinButton
                        checked={c.checked_in}
                        pending={checkin.isPending && checkin.variables === c.game_id}
                        onClick={() => checkin.mutate(c.game_id)}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}