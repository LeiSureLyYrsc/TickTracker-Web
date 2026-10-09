import { CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function StatusBadge({ checked }: { checked: boolean }) {
  return (
    <Badge variant={checked ? 'success' : 'muted'}>
      {checked ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      {checked ? '已打卡' : '未打卡'}
    </Badge>
  )
}