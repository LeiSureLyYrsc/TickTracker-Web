import { useConfirmStore, type ConfirmOptions } from '@/stores/confirm'

export function useConfirm() {
  const store = useConfirmStore()
  return (opts: ConfirmOptions) => store.confirm(opts)
}