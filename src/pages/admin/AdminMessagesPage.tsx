import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCheck, MailOpen } from 'lucide-react'
import { toast } from 'sonner'
import { Api } from '@/lib/api'
import { qk } from '@/lib/query'
import { formatDateTime } from '@/lib/utils'
import type { Message } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Empty } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminMessagesPage() {
  const qc = useQueryClient()
  const [unreadOnly, setUnreadOnly] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: [...qk.admin.messages, unreadOnly] as const,
    queryFn: () => Api<Message[]>(`/api/admin/messages?unread_only=${unreadOnly}`),
  })

  const markRead = useMutation({
    mutationFn: (id: number) => Api(`/api/admin/messages/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => {
      toast.success('已标记为已读')
      qc.invalidateQueries({ queryKey: qk.admin.messages })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '操作失败'),
  })

  const messages = data ?? []

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">共 {messages.length} 条</span>
        <Button variant={unreadOnly ? 'tonal' : 'ghost'} size="sm" onClick={() => setUnreadOnly((v) => !v)}>
          <MailOpen />
          {unreadOnly ? '仅看未读' : '全部'}
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : messages.length === 0 ? (
        <Empty title="暂无留言" />
      ) : (
        messages.map((m) => (
          <Card key={m.id}>
            <CardContent className="flex flex-col gap-2 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{m.user_name}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{m.game_name}</span>
                <Badge variant={m.is_read ? 'muted' : 'default'}>{m.is_read ? '已读' : '未读'}</Badge>
                <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(m.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{m.content}</p>
              {!m.is_read && (
                <Button variant="tonal" size="sm" className="self-start" onClick={() => markRead.mutate(m.id)}>
                  <CheckCheck />
                  标记已读
                </Button>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}