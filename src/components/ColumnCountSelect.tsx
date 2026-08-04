import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ViewColumnIcon from '@mui/icons-material/ViewColumn'
import { COLUMN_OPTIONS, type ColumnCount } from '../lib/columns'

interface Props {
  value: ColumnCount
  onChange: (value: ColumnCount) => void
}

export default function ColumnCountSelect({ value, onChange }: Props) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
        每行
      </Typography>
      <TextField
        select
        size="small"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) as ColumnCount)}
        sx={{ minWidth: 96 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <ViewColumnIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      >
        {COLUMN_OPTIONS.map((n) => (
          <MenuItem key={n} value={n}>
            {n} 列
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  )
}
