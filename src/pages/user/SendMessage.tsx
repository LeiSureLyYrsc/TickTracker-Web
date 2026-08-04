import { useCallback, useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import FormHelperText from '@mui/material/FormHelperText'
import InputLabel from '@mui/material/InputLabel'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import SendIcon from '@mui/icons-material/Send'
import HistoryIcon from '@mui/icons-material/History'
import { apiFetch, readError } from '../../lib/api'
import { useToast } from '../../lib/toast'

interface GameOption {
  id: number
  name: string
  group_id: number | null
  group_name: string | null
}

interface MyMessage {
  id: number
  game_name: string
  content: string
  created_at: string
  is_read: boolean
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN')
}

export default function SendMessage() {
  const toast = useToast()
  const [games, setGames] = useState<GameOption[]>([])
  const [game, setGame] = useState('')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<MyMessage[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const grouped = useMemo(() => {
    const map = new Map<string, GameOption[]>()
    for (const g of games) {
      const key = g.group_name ?? '未分组'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(g)
    }
    return [...map.entries()]
  }, [games])

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await apiFetch('/api/user/me/messages')
      if (!res.ok) throw new Error()
      setMessages((await res.json()) as MyMessage[])
    } catch {
      toast('加载留言历史失败', 'error')
    } finally {
      setHistoryLoading(false)
    }
  }, [toast])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await apiFetch('/api/user/games')
        if (!res.ok) throw new Error()
        setGames((await res.json()) as GameOption[])
      } catch {
        toast('加载游戏列表失败', 'error')
      }
    })()
  }, [toast])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  async function send() {
    if (!game) return toast('请选择游戏', 'error')
    if (!content.trim()) return toast('请填写留言内容', 'error')
    setSending(true)
    try {
      const res = await apiFetch('/api/user/me/messages', {
        method: 'POST',
        body: JSON.stringify({ game_name: game, content: content.trim() }),
      })
      if (res.ok) {
        setContent('')
        toast('留言已发送', 'success')
        loadHistory()
      } else {
        toast(await readError(res), 'error')
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <Stack spacing={2} sx={{ maxWidth: 640 }}>
      <Card>
        <CardHeader
          title={
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <SendIcon color="primary" />
              <span>发送留言给管理员</span>
            </Stack>
          }
          titleTypographyProps={{ variant: 'h6' }}
        />
        <CardContent>
          <Stack spacing={2}>
            <Box>
              <InputLabel>选择游戏</InputLabel>
              <Select
                fullWidth
                value={game}
                disabled={!games.length}
                onChange={(e) => setGame(e.target.value)}
              >
                {grouped.map(([name, list]) => [
                  <MenuItem key={`h-${name}`} disabled>
                    {name}
                  </MenuItem>,
                  ...list.map((g) => (
                    <MenuItem key={g.id} value={g.name}>
                      {g.name}
                    </MenuItem>
                  )),
                ])}
              </Select>
              {!games.length && (
                <FormHelperText>你还没有已绑定的代肝游戏，暂时无法留言</FormHelperText>
              )}
            </Box>
            <TextField
              label="留言内容"
              multiline
              rows={4}
              fullWidth
              disabled={!games.length}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <Button
              variant="contained"
              disabled={!games.length || sending}
              onClick={send}
              sx={{ alignSelf: 'flex-start' }}
            >
              发送
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title={
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <HistoryIcon color="primary" />
              <span>历史留言</span>
            </Stack>
          }
          action={
            <Button size="small" onClick={loadHistory}>
              刷新
            </Button>
          }
          titleTypographyProps={{ variant: 'h6' }}
        />
        <Divider />
        <CardContent>
          {historyLoading && <LinearProgress sx={{ mb: 1 }} />}
          {!historyLoading && messages.length === 0 && (
            <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
              暂无留言记录
            </Typography>
          )}
          <Stack spacing={1.5}>
            {messages.map((m) => (
              <Box
                key={m.id}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: m.is_read ? 'divider' : 'primary.main',
                }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}
                >
                  <Typography variant="body2">
                    <strong>{m.game_name}</strong>
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      {formatTime(m.created_at)}
                    </Typography>
                  </Typography>
                  <Chip
                    label={m.is_read ? '已读' : '未读'}
                    size="small"
                    color={m.is_read ? 'default' : 'primary'}
                    variant={m.is_read ? 'outlined' : 'filled'}
                  />
                </Stack>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {m.content}
                </Typography>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
