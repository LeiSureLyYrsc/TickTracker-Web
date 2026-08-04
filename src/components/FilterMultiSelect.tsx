import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Typography from '@mui/material/Typography'
import type { SxProps, Theme } from '@mui/material/styles'

export interface FilterOption {
  value: string
  label: string
}

interface Props {
  label: string
  options: FilterOption[]
  value: string[]
  onChange: (value: string[]) => void
  sx?: SxProps<Theme>
  renderLabel?: (value: string) => ReactNode
}

export default function FilterMultiSelect({ label, options, value, onChange, sx, renderLabel }: Props) {
  return (
    <FormControl size="small" sx={{ minWidth: 180, maxWidth: 320, ...sx }}>
      <InputLabel>{label}</InputLabel>
      <Select
        multiple
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value as string[])}
        renderValue={(selected) =>
          selected.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              全部
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((v) => (
                <Chip
                  key={v}
                  label={
                    renderLabel
                      ? renderLabel(v)
                      : (options.find((o) => o.value === v)?.label ?? v)
                  }
                  size="small"
                />
              ))}
            </Box>
          )
        }
      >
        <MenuItem
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onChange([])
          }}
          sx={{ color: 'text.secondary', fontStyle: 'italic' }}
        >
          <Typography variant="body2">清除筛选</Typography>
        </MenuItem>
        {options.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            <Checkbox size="small" checked={value.includes(o.value)} />
            {o.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
