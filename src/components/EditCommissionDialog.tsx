import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormHelperText from '@mui/material/FormHelperText'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { apiFetch, readError } from '../lib/api'
import { useToast } from '../lib/toast'
import type { Commission } from '../types'

interface Props {
  open: boolean
  record: Commission | null
  groupTotal: number
  onClose: () => void
  onSaved: () => void
}

export default function EditCommissionDialog({ open, record, groupTotal, onClose, onSaved }: Props) {
  const toast = useToast()
  const [total, setTotal] = useState('')
  const [completed, setCompleted] = useState('')
  const [checked, setChecked] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && record) {
      setTotal(String(groupTotal))
      setCompleted(String(record.completed_count))
      setChecked(record.checked_in ? 'true' : 'false')
    }
  }, [open, record, groupTotal])

  async function save() {
    if (!record) return
    setSaving(true)
    try {
      if (record.group_id != null && Number(total) !== groupTotal) {
        const res = await apiFetch('/api/admin/group-commissions', {
          method: 'POST',
          body: JSON.stringify({
            user_name: record.user_name,
            game_group_id: record.group_id,
            total_count: Number(total) || 0,
          }),
        })
        if (!res.ok) return toast(await readError(res), 'error')
      }
      const body: { completed_count?: number; checked_in?: boolean } = {}
      if (Number(completed) !== record.completed_count) body.completed_count = Number(completed) || 0
      const checkedValue = checked === 'true'
      if (checkedValue !== record.checked_in) body.checked_in = checkedValue
      if (Object.keys(body).length > 0) {
        const res = await apiFetch(`/api/admin/commissions/${record.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
        if (!res.ok) return toast(await readError(res), 'error')
      }
      toast('修改成功', 'success')
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>修改记录</DialogTitle>
      <DialogContent>
        {record && (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {record.user_name} · {record.game_name}
              {record.group_name ? ` · ${record.group_name}` : ''}
            </Typography>
            <TextField
              label="游戏组应得次数"
              type="number"
              size="small"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              disabled={record.group_id == null}
              helperText={record.group_id == null ? '未分组，无法设置应得次数' : undefined}
            />
            <TextField
              label="已完成次数（已代肝）"
              type="number"
              size="small"
              value={completed}
              onChange={(e) => setCompleted(e.target.value)}
            />
            <Box>
              <TextField
                select
                fullWidth
                label="打卡状态"
                size="small"
                value={checked}
                onChange={(e) => setChecked(e.target.value)}
              >
                <MenuItem value="false">未打卡</MenuItem>
                <MenuItem value="true">已打卡</MenuItem>
              </TextField>
              <FormHelperText>修改打卡状态不会增加已完成次数</FormHelperText>
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>取消</Button>
        <Button variant="tonal" onClick={save} disabled={!record || saving}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  )
}
