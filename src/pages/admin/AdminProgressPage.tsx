import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Search, Users } from 'lucide-react'
import { Api } from '@/lib/api'
import { qk } from '@/lib/query'
import type { Commission } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminProgressPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: qk.admin.commissions,
    queryFn: () => Api<Commission[]>('/api/admin/commissions'),
    refetchInterval: 20_000,
  })

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; list: Commission[]; done: number }>()
    for (const r of data ?? []) {
      if (!map.has(r.user_name)) map.set(r.user_name, { name: r.user_name, list: [], done: 0 })
      const g = map.get(r.user_name)!
      g.list.push(r)
      if (r.checked_in) g.done += 1
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  }, [data])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? groups.filter((g) => g.name.toLowerCase().includes(q)) : groups
  }, [groups, search])

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="搜索用户名" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant="ghost" size="icon" onClick={() => qc.invalidateQueries({ queryKey: qk.admin.commissions })} aria-label="刷新">
          <RefreshCw />
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : visible.length === 0 ? (
        <Empty title={search ? '无匹配用户' : '暂无数据'} icon={<Users className="h-8 w-8" />} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((g) => (
            <Card key={g.name}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="truncate">{g.name}</CardTitle>
                <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                  {g.done}/{g.list.length}
                </span>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {g.list.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 rounded-full border border-border py-1 pl-3 pr-1.5">
                    <span className="text-sm">{r.game_name}</span>
                    <StatusBadge checked={r.checked_in} />
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