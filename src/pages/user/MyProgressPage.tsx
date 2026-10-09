import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { Api } from '@/lib/api'
import { qk } from '@/lib/query'
import type { ProgressItem } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'

export default function MyProgressPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: qk.user.progress,
    queryFn: () => Api<ProgressItem[]>('/api/user/me/progress'),
    refetchInterval: 15_000,
  })

  const games = data ?? []
  const done = useMemo(() => games.filter((g) => g.checked_in).length, [games])

  const groups = useMemo(() => {
    const map = new Map<string, ProgressItem[]>()
    for (const g of games) {
      const key = g.group_name ?? '未分组'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(g)
    }
    return [...map.entries()]
  }, [games])

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => qc.invalidateQueries({ queryKey: qk.user.progress })}>
          <RefreshCw />
          刷新
        </Button>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-6">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <>
              <div className="text-5xl">{done === games.length && games.length > 0 ? '🎉' : '🎮'}</div>
              <p className="text-lg font-semibold">
                已打卡 {done} / {games.length}
              </p>
              {groups.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无代肝记录</p>
              ) : (
                groups.map(([name, list]) => (
                  <div key={name} className="w-full">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">{name}</p>
                    <div className="flex flex-wrap gap-2">
                      {list.map((g) => (
                        <div
                          key={g.game_name}
                          className="flex items-center gap-2 rounded-full border border-border py-1 pl-3 pr-1.5"
                        >
                          <span className="text-sm">{g.game_name}</span>
                          <StatusBadge checked={g.checked_in} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}