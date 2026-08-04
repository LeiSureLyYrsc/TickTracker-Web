import { useCallback, useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import FolderIcon from '@mui/icons-material/Folder'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../lib/toast'
import { useColumnCount } from '../../lib/columns'
import ColumnCountSelect from '../../components/ColumnCountSelect'
import MasonryColumns from '../../components/MasonryColumns'
import StatusChip from '../../components/StatusChip'
import type { Commission } from '../../types'

interface MyGroupDue {
  game_group_id: number
  group_name: string
  total_count: number
}

interface GroupView {
  group_id: number | null
  group_name: string
  total: number
  games: Commission[]
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN')
}

export default function MyCommissions() {
  const toast = useToast()
  const { columns, setColumns } = useColumnCount('ct_mycommissions_cols')
  const [records, setRecords] = useState<Commission[]>([])
  const [dues, setDues] = useState<MyGroupDue[]>([])
  const [loading, setLoading] = useState(false)

  const groups = useMemo<GroupView[]>(() => {
    const byGroup = new Map<number | null, GroupView>()
    for (const r of records) {
      const key = r.group_id
      if (!byGroup.has(key)) {
        byGroup.set(key, {
          group_id: key,
          group_name: r.group_name ?? '未分组',
          total: 0,
          games: [],
        })
      }
      byGroup.get(key)!.games.push(r)
    }
    for (const d of dues) {
      if (byGroup.has(d.game_group_id)) byGroup.get(d.game_group_id)!.total = d.total_count
    }
    return [...byGroup.values()].sort((a, b) => {
      if (a.group_id == null) return 1
      if (b.group_id == null) return -1
      return a.group_name.localeCompare(b.group_name, 'zh-CN')
    })
  }, [records, dues])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cRes, dRes] = await Promise.all([
        apiFetch('/api/user/me/commissions'),
        apiFetch('/api/user/me/group-commissions'),
      ])
      if (!cRes.ok || !dRes.ok) throw new Error()
      setRecords((await cRes.json()) as Commission[])
      setDues((await dRes.json()) as MyGroupDue[])
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
        <Box sx={{ flexGrow: 1 }} />
        <ColumnCountSelect value={columns} onChange={setColumns} />
        <Button onClick={load}>刷新</Button>
      </Stack>
      {loading && <LinearProgress />}

      <MasonryColumns
        items={groups}
        columns={columns}
        renderItem={(g) => (
          <Card>
            <CardHeader
              title={
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <FolderIcon color="primary" />
                  <span>{g.group_name}</span>
                </Stack>
              }
              action={
                g.group_id != null ? <Chip label={`应得 ${g.total}`} color="primary" /> : undefined
              }
              titleTypographyProps={{ variant: 'h6' }}
            />
            <Divider />
            <CardContent sx={{ px: 0, pb: 0 }}>
              <TableContainer>
                <Table size="medium">
                  <TableHead>
                    <TableRow>
                      <TableCell>游戏</TableCell>
                      <TableCell>已完成</TableCell>
                      <TableCell>今日状态</TableCell>
                      <TableCell>最后打卡</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {g.games.map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell>
                          <strong>{r.game_name}</strong>
                        </TableCell>
                        <TableCell>{r.completed_count}</TableCell>
                        <TableCell>
                          <StatusChip checked={r.checked_in} />
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>
                          {r.last_checked_in_at ? formatTime(r.last_checked_in_at) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}
      />

      {!loading && groups.length === 0 && (
        <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
          暂无记录
        </Typography>
      )}
    </Box>
  )
}
