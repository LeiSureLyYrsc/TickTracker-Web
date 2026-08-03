import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { PRESETS, usePalette } from '../lib/palette'

interface Props {
  open: boolean
  onClose: () => void
}

export default function PaletteDialog({ open, onClose }: Props) {
  const { seed, setSeed } = usePalette()

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>主题调色盘</DialogTitle>
      <DialogContent>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          预设配色
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
          {PRESETS.map((p) => (
            <Tooltip title={p.name} key={p.seed}>
              <Box
                role="button"
                aria-label={p.name}
                onClick={() => setSeed(p.seed)}
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  bgcolor: p.seed,
                  border: '1px solid',
                  borderColor: seed === p.seed ? 'text.primary' : 'outlineVariant',
                  outline: seed === p.seed ? '3px solid rgba(0,0,0,0.15)' : 'none',
                  boxSizing: 'border-box',
                }}
              />
            </Tooltip>
          ))}
        </Box>

        <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
          自定义颜色
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <input
            type="color"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            style={{ width: 48, height: 48, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
          />
          <Typography variant="body2" color="text.secondary">
            {seed.toUpperCase()}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>完成</Button>
      </DialogActions>
    </Dialog>
  )
}
