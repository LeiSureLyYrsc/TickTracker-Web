import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { argbFromHex, hexFromArgb, themeFromSourceColor } from '@material/material-color-utilities'
import { usePalette } from '../lib/palette'
import { hexToHsl, hslToHex } from '../lib/color'

interface Props {
  open: boolean
  onClose: () => void
}

interface Hsl {
  h: number
  s: number
  l: number
}

function isHex(v: string) {
  return /^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(v.trim())
}

export default function PaletteDialog({ open, onClose }: Props) {
  const { seed, setSeed } = usePalette()
  const [hsl, setHsl] = useState<Hsl>(() => hexToHsl(seed))
  const [hexInput, setHexInput] = useState(seed.toUpperCase())

  useEffect(() => {
    if (open) {
      setHsl(hexToHsl(seed))
      setHexInput(seed.toUpperCase())
    }
  }, [open, seed])

  const hex = hslToHex(hsl.h, hsl.s, hsl.l)

  function applyHsl(next: Hsl) {
    setHsl(next)
    const hx = hslToHex(next.h, next.s, next.l)
    setHexInput(hx.toUpperCase())
    setSeed(hx)
  }

  function applyHex(raw: string) {
    const v = raw.trim().replace(/^#/, '')
    if (isHex(v)) {
      const full = v.length === 3 ? v.split('').map((c) => c + c).join('') : v
      const hx = `#${full}`
      setHsl(hexToHsl(hx))
      setHexInput(hx.toUpperCase())
      setSeed(hx)
    } else {
      setHexInput(raw)
    }
  }

  const preview = useMemo(() => {
    try {
      const md = themeFromSourceColor(argbFromHex(hex))
      const scheme = md.schemes.light as unknown as Record<string, number>
      const pick = (k: string) => hexFromArgb(scheme[k])
      return [
        { label: '主色', color: pick('primary') },
        { label: '主色容器', color: pick('primaryContainer') },
        { label: '次级容器', color: pick('secondaryContainer') },
        { label: '三级', color: pick('tertiary') },
        { label: '表面', color: pick('surface') },
        { label: '错误', color: pick('error') },
      ]
    } catch {
      return []
    }
  }, [hex])

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>主题调色盘</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'center' }}>
            <input
              type="color"
              value={hex}
              onChange={(e) => {
                const v = e.target.value
                setHsl(hexToHsl(v))
                setHexInput(v.toUpperCase())
                setSeed(v)
              }}
              style={{
                width: 64,
                height: 64,
                border: '1px solid rgba(128,128,128,0.35)',
                borderRadius: 16,
                background: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            />
            <Box>
              <Typography variant="subtitle1">{hex.toUpperCase()}</Typography>
              <Typography variant="body2" color="text.secondary">
                选择主色后自动生成整套 Material 3 配色
              </Typography>
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              色相 {hsl.h}
            </Typography>
            <Slider
              value={hsl.h}
              min={0}
              max={360}
              onChange={(_, v) => applyHsl({ ...hsl, h: v as number })}
              sx={{
                background:
                  'linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))',
                borderRadius: 999,
                color: 'transparent',
                '& .MuiSlider-thumb': { color: hex },
              }}
            />
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              饱和度 {hsl.s}
            </Typography>
            <Slider
              value={hsl.s}
              min={0}
              max={100}
              onChange={(_, v) => applyHsl({ ...hsl, s: v as number })}
              sx={{
                background: `linear-gradient(to right, hsl(${hsl.h},0%,${hsl.l}%), hsl(${hsl.h},100%,${hsl.l}%))`,
                borderRadius: 999,
                color: 'transparent',
                '& .MuiSlider-thumb': { color: hex },
              }}
            />
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              明度 {hsl.l}
            </Typography>
            <Slider
              value={hsl.l}
              min={0}
              max={100}
              onChange={(_, v) => applyHsl({ ...hsl, l: v as number })}
              sx={{
                background: `linear-gradient(to right, hsl(${hsl.h},${hsl.s}%,0%), hsl(${hsl.h},${hsl.s}%,50%), hsl(${hsl.h},${hsl.s}%,100%))`,
                borderRadius: 999,
                color: 'transparent',
                '& .MuiSlider-thumb': { color: hex },
              }}
            />
          </Box>

          <TextField
            label="十六进制颜色"
            size="small"
            value={hexInput}
            onChange={(e) => applyHex(e.target.value)}
            onBlur={() => setHexInput(hex.toUpperCase())}
            sx={{ maxWidth: 200 }}
          />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              配色预览
            </Typography>
            <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {preview.map((p) => (
                <Tooltip title={`${p.label} ${p.color}`} key={p.label}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      bgcolor: p.color,
                      border: '1px solid rgba(128,128,128,0.35)',
                    }}
                  />
                </Tooltip>
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>完成</Button>
      </DialogActions>
    </Dialog>
  )
}
