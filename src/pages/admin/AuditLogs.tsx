import { useCallback, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import InputAdornment from '@mui/material/InputAdornment'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import SearchIcon from '@mui/icons-material/Search'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../lib/toast'
import type { AuditLog } from '../../types'

const PAGE_SIZE = 100

const ACTOR_LABELS: Record<string, { label: string; color: 'primary' | 'secondary' | 'default' }> = {
  admin: { label: '管理员', color: 'primary' },
  user: { label: '用户', color: 'secondary' },
  qq: { label: 'QQ', color: 'default' },
  system: { label: '系统', color: 'default' },
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN')
}

export default function AuditLogs() {
  const toast = useToast()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [hasMore, setHasMore] = useState(true)

  const load = useCallback(
    async (nextLimit: number, append: boolean, searchQ: string) => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (searchQ) params.set('q', searchQ)
        params.set('limit', String(nextLimit))
        const res = await apiFetch(`/api/admin/audit-logs?${params.toString()}`)
        if (!res.ok) throw new Error()
        const list = (await res.json()) as AuditLog[]
        setLogs((prev) => (append ? [...prev, ...list] : list))
        setHasMore(list.length === nextLimit)
      } catch {
        toast('加载失败', 'error')
      } finally {
        setLoading(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    load(PAGE_SIZE, false, '')
  }, [load])

  function applySearch() {
    setQ(search.trim())
    setLimit(PAGE_SIZE)
    load(PAGE_SIZE, false, search.trim())
  }

  function loadMore() {
    const next = limit + PAGE_SIZE
    setLimit(next)
    load(next, true, q)
  }

  return (
    <Box>
      <Card sx={{ p: 1.5, mb: 2 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
          <TextField
            size="small"
            placeholder="搜索操作者 / 动作 / 目标 / 详情 / IP"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            sx={{ maxWidth: 360 }}
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
          <Button onClick={applySearch}>搜索</Button>
          <Button onClick={() => { setSearch(''); setQ(''); setLimit(PAGE_SIZE); load(PAGE_SIZE, false, '') }}>
            刷新
          </Button>
        </Stack>
      </Card>

      {loading && <LinearProgress />}

      <TableContainer component={Card}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>时间</TableCell>
              <TableCell>操作者</TableCell>
              <TableCell>动作</TableCell>
              <TableCell>目标</TableCell>
              <TableCell>详情</TableCell>
              <TableCell>IP</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((l) => {
              const meta = ACTOR_LABELS[l.actor_type] ?? { label: l.actor_type, color: 'default' as const }
              return (
                <TableRow key={l.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatTime(l.created_at)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Chip label={meta.label} size="small" color={meta.color} variant="outlined" sx={{ mr: 1 }} />
                    <strong>{l.actor_name}</strong>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{l.action}</TableCell>
                  <TableCell>{l.target ?? '-'}</TableCell>
                  <TableCell sx={{ maxWidth: 360, whiteSpace: 'pre-wrap' }}>{l.detail ?? '-'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{l.ip ?? '-'}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {!loading && logs.length === 0 && (
        <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
          暂无日志
        </Typography>
      )}

      {hasMore && !loading && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Button variant="tonal" onClick={loadMore}>
            加载更多
          </Button>
        </Box>
      )}
    </Box>
  )
}
