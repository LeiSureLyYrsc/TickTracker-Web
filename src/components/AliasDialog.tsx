import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { apiFetch, readError } from '../lib/api'
import { useToast } from '../lib/toast'

export interface AliasTarget {
  type: 'user' | 'game'
  id: number
  name: string
  aliases: string[]
}

interface Props {
  open: boolean
  target: AliasTarget | null
  onClose: () => void
  onRefresh: () => void
}

export default function AliasDialog({ open, target, onClose, onRefresh }: Props) {
  const toast = useToast()
  const [list, setList] = useState<string[]>([])
  const [input, setInput] = useState('')

  useEffect(() => {
    if (open && target) {
      setList(target.aliases)
      setInput('')
    }
  }, [open, target])

  async function add() {
    const alias = input.trim()
    if (!alias || !target) return
    const res = await apiFetch(`/api/admin/${target.type}s/${target.id}/aliases`, {
      method: 'POST',
      body: JSON.stringify({ alias }),
    })
    if (res.ok) {
      setList((l) => [...l, alias])
      setInput('')
      toast('别名已添加', 'success')
      onRefresh()
    } else {
      toast(await readError(res), 'error')
    }
  }

  async function remove(alias: string) {
    if (!target) return
    const res = await apiFetch(
      `/api/admin/${target.type}s/${target.id}/aliases/${encodeURIComponent(alias)}`,
      { method: 'DELETE' },
    )
    if (res.ok) {
      setList((l) => l.filter((a) => a !== alias))
      toast('别名已删除', 'success')
      onRefresh()
    } else {
      toast(await readError(res), 'error')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>管理别名 - {target?.name ?? ''}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {list.length ? (
            list.map((a) => <Chip key={a} label={a} onDelete={() => remove(a)} />)
          ) : (
            <Typography variant="body2" color="text.secondary">
              暂无别名
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            fullWidth
            size="small"
            label="新别名"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <Button variant="tonal" onClick={add} disabled={!input.trim()}>
            添加
          </Button>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  )
}
