import Chip from '@mui/material/Chip'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'

export default function StatusChip({ checked }: { checked: boolean }) {
  return (
    <Chip
      icon={checked ? <CheckCircleIcon /> : <CancelIcon />}
      label={checked ? '已打卡' : '未打卡'}
      size="small"
      sx={{
        borderRadius: 999,
        bgcolor: checked ? 'primaryContainer' : 'errorContainer',
        color: checked ? 'onPrimaryContainer' : 'onErrorContainer',
        '& .MuiChip-icon': {
          color: checked ? 'onPrimaryContainer' : 'onErrorContainer',
        },
      }}
    />
  )
}
