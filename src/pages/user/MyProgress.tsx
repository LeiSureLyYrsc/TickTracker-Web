import { useCallback, useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../lib/toast'
import StatusChip from '../../components/StatusChip'

interface ProgressItem {
  game_name: string
  group_id: number | null
  group_name: string | null
  checked_in: boolean
  last_checked_in_at: string | null
}

export default function MyProgress() {
  const toast = useToast()
  const [games, setGames] = useState<ProgressItem[]>([])
  const [loading, setLoading] = useState(false)

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

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/user/me/progress')
      if (!res.ok) throw new Error()
      setGames((await res.json()) as ProgressItem[])
    } catch {
      toast('加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  return (
    <Box>
      <Button onClick={load} sx={{ mb: 2 }}>
        刷新
      </Button>
      {loading && <LinearProgress />}
      <Card sx={{ textAlign: 'center', p: 3 }}>
        <CardContent>
          <Typography variant="h2" sx={{ mb: 1 }}>
            {done === games.length ? '🎉' : '🎮'}
          </Typography>
          <Typography variant="h6" sx={{ mb: 2 }}>
            已打卡 {done} / {games.length}
          </Typography>
          {groups.map(([name, list]) => (
            <Box key={name} sx={{ mb: 2, textAlign: 'left' }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                {name}
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap sx={{ justifyContent: 'center', flexWrap: 'wrap', rowGap: 1 }}>
                {list.map((g) => (
                  <Stack
                    key={g.game_name}
                    direction="row"
                    spacing={1}
                    sx={{
                      alignItems: 'center',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 999,
                      pl: 1.5,
                      pr: 0.5,
                      py: 0.5,
                    }}
                  >
                    <Typography variant="body2">{g.game_name}</Typography>
                    <StatusChip checked={g.checked_in} />
                  </Stack>
                ))}
              </Stack>
            </Box>
          ))}
        </CardContent>
      </Card>
    </Box>
  )
}
