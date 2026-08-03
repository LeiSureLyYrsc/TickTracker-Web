import { useCallback, useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../lib/toast'
import StatusChip from '../../components/StatusChip'
import type { Commission } from '../../types'

interface Group {
  name: string
  done: number
  list: Commission[]
}

export default function Progress() {
  const toast = useToast()
  const [records, setRecords] = useState<Commission[]>([])
  const [loading, setLoading] = useState(false)

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>()
    for (const r of records) {
      if (!map.has(r.user_name)) map.set(r.user_name, { name: r.user_name, done: 0, list: [] })
      const g = map.get(r.user_name)!
      g.list.push(r)
      if (r.checked_in) g.done += 1
    }
    return [...map.values()]
  }, [records])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/admin/commissions')
      if (!res.ok) throw new Error()
      setRecords((await res.json()) as Commission[])
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

      {groups.map((g) => (
        <Card key={g.name} sx={{ mb: 2 }}>
          <CardHeader
            title={g.name}
            action={<Chip label={`${g.done}/${g.list.length}`} />}
            titleTypographyProps={{ variant: 'h6' }}
          />
          <CardContent>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {g.list.map((r) => (
                <StatusChip key={r.game_id} checked={r.checked_in} />
              ))}
            </Stack>
          </CardContent>
        </Card>
      ))}
      {!loading && groups.length === 0 && (
        <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
          暂无数据
        </Typography>
      )}
    </Box>
  )
}
