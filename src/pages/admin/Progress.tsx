import { useCallback, useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import InputAdornment from '@mui/material/InputAdornment'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import SearchIcon from '@mui/icons-material/Search'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../lib/toast'
import { useColumnCount } from '../../lib/columns'
import ColumnCountSelect from '../../components/ColumnCountSelect'
import MasonryColumns from '../../components/MasonryColumns'
import StatusChip from '../../components/StatusChip'
import type { Commission } from '../../types'

interface Group {
  name: string
  done: number
  list: Commission[]
}

export default function Progress() {
  const toast = useToast()
  const { columns, setColumns } = useColumnCount('ct_progress_cols')
  const [records, setRecords] = useState<Commission[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

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

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return groups
    return groups.filter((g) => g.name.toLowerCase().includes(q))
  }, [groups, search])

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
      <Stack
        direction="row"
        spacing={2}
        sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap', rowGap: 1.5 }}
      >
        <TextField
          size="small"
          placeholder="搜索用户名"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ maxWidth: 240 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Box sx={{ flexGrow: 1 }} />
        <ColumnCountSelect value={columns} onChange={setColumns} />
        <Button onClick={load}>刷新</Button>
      </Stack>
      {loading && <LinearProgress />}

      <MasonryColumns
        items={visible}
        columns={columns}
        renderItem={(g) => (
          <Card>
            <CardHeader
              title={g.name}
              action={<Chip label={`${g.done}/${g.list.length}`} />}
              titleTypographyProps={{ variant: 'h6' }}
            />
            <CardContent>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                {g.list.map((r) => (
                  <Stack
                    key={r.id}
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
                    <Typography variant="body2">{r.game_name}</Typography>
                    <StatusChip checked={r.checked_in} />
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}
      />
      {!loading && visible.length === 0 && (
        <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
          {search ? '无匹配用户' : '暂无数据'}
        </Typography>
      )}
    </Box>
  )
}
