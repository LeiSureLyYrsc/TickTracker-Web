import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

let resolver: ((v: boolean) => void) | null = null

export const useConfirmStore = defineStore('confirm', () => {
  const open = ref(false)
  const options = ref<ConfirmOptions>({ title: '' })

  function confirm(opts: ConfirmOptions): Promise<boolean> {
    options.value = opts
    open.value = true
    return new Promise<boolean>((r) => {
      resolver = r
    })
  }

  function settle(v: boolean) {
    open.value = false
    resolver?.(v)
    resolver = null
  }

  return { open, options, confirm, settle }
})