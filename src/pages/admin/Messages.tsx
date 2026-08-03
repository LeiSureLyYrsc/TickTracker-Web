import { useCallback, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { apiFetch, readError } from '../../lib/api'
import { useToast } from '../../lib/toast'
import type { Message } from '../../types'

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN')
}

export default function Messages() {
  const toast = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [unreadOnly, setUnreadOnly] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/admin/messages${unreadOnly ? '?unread_only=true' : ''}`)
      if (!res.ok) throw new Error()
      setMessages((await res.json()) as Message[])
    } catch {
      toast('加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast, unreadOnly])

  useEffect(() => {
    load()
  }, [load])

  async function markRead(m: Message) {
    const res = await apiFetch(`/api/admin/messages/${m.id}/read`, { method: 'PATCH' })
    if (res.ok) {
      toast('已标记为已读', 'success')
      if (unreadOnly) setMessages((list) => list.filter((x) => x.id !== m.id))
      else setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, is_read: true } : x)))
    } else {
      toast(await readError(res), 'error')
    }
  }

  return (
    <Box>
      <Card sx={{ p: 1.5, mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <FormControlLabel
          control={
            <Checkbox checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
          }
          label="只看未读"
        />
      </Card>

      {loading && <LinearProgress />}

      {messages.map((m) => (
        <Card
          key={m.id}
          sx={{
            mb: 2,
            p: 2,
            borderLeft: 4,
            borderColor: m.is_read ? 'transparent' : 'primary.main',
          }}
        >
          <Stack
            direction="row"
            spacing={2}
            sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
          >
            <Typography variant="body1">
              <strong>{m.user_name}</strong>{' '}
              <Typography component="span" color="text.secondary">
                →
              </Typography>{' '}
              <Typography component="span" color="primary">
                {m.game_name}
              </Typography>
            </Typography>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                {formatTime(m.created_at)}
              </Typography>
              {!m.is_read && (
                <Button size="small" onClick={() => markRead(m)}>
                  标为已读
                </Button>
              )}
            </Stack>
          </Stack>
          <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{m.content}</Typography>
        </Card>
      ))}
      {!loading && messages.length === 0 && (
        <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
          暂无留言
        </Typography>
      )}
    </Box>
  )
}
