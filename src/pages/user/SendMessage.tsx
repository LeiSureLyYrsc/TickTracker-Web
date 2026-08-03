import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import FormHelperText from '@mui/material/FormHelperText'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { apiFetch, readError } from '../../lib/api'
import { useToast } from '../../lib/toast'

interface GameOption {
  id: number
  name: string
  group_id: number | null
  group_name: string | null
}

export default function SendMessage() {
  const toast = useToast()
  const [games, setGames] = useState<GameOption[]>([])
  const [game, setGame] = useState('')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

  const grouped = useMemo(() => {
    const map = new Map<string, GameOption[]>()
    for (const g of games) {
      const key = g.group_name ?? '未分组'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(g)
    }
    return [...map.entries()]
  }, [games])

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
      } else {
        toast(await readError(res), 'error')
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <Card sx={{ maxWidth: 520 }}>
      <CardHeader title="发送留言给管理员" titleTypographyProps={{ variant: 'h6' }} />
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
  )
}
