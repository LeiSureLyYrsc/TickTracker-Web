import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw, Search } from 'lucide-react'
import { Api } from '@/lib/api'
import { qk } from '@/lib/query'
import { formatDateTime } from '@/lib/utils'
import type { AuditLog } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Empty } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminAuditPage() {
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: [...qk.admin.audit, q] as const,
    queryFn: () => Api<AuditLog[]>(`/api/admin/audit-logs?limit=200&q=${encodeURIComponent(q)}`),
  })

  const logs = data ?? []

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="搜索操作者 / 动作 / 目标 / IP"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setQ(search.trim())}
          />
        </div>
        <Button variant="tonal" onClick={() => setQ(search.trim())}>
          搜索
        </Button>
        <Button variant="ghost" size="icon" onClick={() => refetch()} aria-label="刷新">
          <RefreshCw />
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : logs.length === 0 ? (
        <Empty title="暂无日志" />
      ) : (
        <div className="flex flex-col gap-2">
          {logs.map((l) => (
            <Card key={l.id}>
              <CardContent className="flex flex-col gap-1 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{l.action}</span>
                  <span className="text-xs text-muted-foreground">
                    {l.actor_type} · {l.actor_name}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(l.created_at)}</span>
                </div>
                {l.target && <p className="text-muted-foreground">目标：{l.target}</p>}
                {l.detail && <p className="text-muted-foreground">详情：{l.detail}</p>}
                {l.ip && <p className="text-xs text-muted-foreground">IP：{l.ip}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}