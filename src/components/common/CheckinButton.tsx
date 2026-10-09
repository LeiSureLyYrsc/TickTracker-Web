import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

export function CheckinButton({
  checked,
  pending,
  onClick,
  className,
  count,
}: {
  checked: boolean
  pending?: boolean
  onClick: () => void
  className?: string
  count?: number
}) {
  return (
    <Button
      variant={checked ? 'tonal' : 'default'}
      onClick={onClick}
      disabled={pending}
      className={cn('min-w-24', className)}
    >
      {pending ? <Spinner /> : <Check />}
      {checked ? (count != null ? `再打卡 +1（${count}）` : '再打卡 +1') : '打卡'}
    </Button>
  )
}