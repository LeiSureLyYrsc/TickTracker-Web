import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import { toast } from 'sonner'
import { Api } from '@/lib/api'
import { qk } from '@/lib/query'
import { formatDateTime } from '@/lib/utils'
import type { MyMessage, UserGame } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty } from '@/components/ui/empty'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'

export default function SendMessagePage() {
  const qc = useQueryClient()
  const [gameName, setGameName] = useState('')
  const [content, setContent] = useState('')

  const { data: games = [] } = useQuery({
    queryKey: qk.user.games,
    queryFn: () => Api<UserGame[]>('/api/user/games'),
  })
  const { data: messages = [] } = useQuery({
    queryKey: qk.user.messages,
    queryFn: () => Api<MyMessage[]>('/api/user/me/messages'),
  })

  const send = useMutation({
    mutationFn: () =>
      Api('/api/user/me/messages', {
        method: 'POST',
        body: JSON.stringify({ game_name: gameName, content: content.trim() }),
      }),
    onSuccess: () => {
      toast.success('留言已发送')
      setContent('')
      qc.invalidateQueries({ queryKey: qk.user.messages })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '发送失败'),
  })

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <Card>
        <CardHeader>
          <CardTitle>发送留言</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <Label>选择游戏</Label>
            <Select value={gameName} onValueChange={setGameName}>
              <SelectTrigger>
                <SelectValue placeholder="仅可选择你已绑定的游戏" />
              </SelectTrigger>
              <SelectContent>
                {games.map((g) => (
                  <SelectItem key={g.id} value={g.name}>
                    {g.group_name ? `${g.group_name} / ${g.name}` : g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>内容</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} />
          </div>
          <Button
            className="self-start"
            onClick={() => {
              if (!gameName) return toast.error('请选择游戏')
              if (!content.trim()) return toast.error('请输入留言内容')
              send.mutate()
            }}
            disabled={send.isPending}
          >
            {send.isPending ? <Spinner /> : <Send />}
            发送
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <h3 className="px-1 text-sm font-medium text-muted-foreground">历史留言</h3>
        {messages.length === 0 ? (
          <Empty title="暂无留言" />
        ) : (
          messages.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex flex-col gap-1 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{m.game_name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={m.is_read ? 'muted' : 'default'}>{m.is_read ? '已读' : '未读'}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDateTime(m.created_at)}</span>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{m.content}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}