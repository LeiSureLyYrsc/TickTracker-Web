import { computed } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { Api } from '@/lib/api'
import { qk } from '@/lib/query'

interface PinnedPayload {
  user_ids: number[]
}

/**
 * 管理端置顶用户（后端持久化，多端共享）。
 * 置顶项排在列表最前，其余保持原有顺序。
 */
export function usePinnedUsers() {
  const qc = useQueryClient()

  const { data } = useQuery<PinnedPayload>({
    queryKey: qk.admin.pinnedUsers,
    queryFn: () => Api<PinnedPayload>('/api/admin/pinned-users'),
  })

  const pinned = computed<number[]>(() => data.value?.user_ids ?? [])

  const save = useMutation({
    mutationFn: (userIds: number[]) =>
      Api<PinnedPayload>('/api/admin/pinned-users', {
        method: 'PUT',
        body: JSON.stringify({ user_ids: userIds }),
      }),
    onMutate: async (userIds: number[]) => {
      await qc.cancelQueries({ queryKey: qk.admin.pinnedUsers })
      const prev = qc.getQueryData<PinnedPayload>(qk.admin.pinnedUsers)
      qc.setQueryData<PinnedPayload>(qk.admin.pinnedUsers, { user_ids: userIds })
      return { prev }
    },
    onError: (e: unknown, _ids, ctx: { prev?: PinnedPayload } | undefined) => {
      if (ctx?.prev) qc.setQueryData(qk.admin.pinnedUsers, ctx.prev)
      toast.error(e instanceof Error ? e.message : '操作失败')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.admin.pinnedUsers }),
  })

  function isPinned(userId: number) {
    return pinned.value.includes(userId)
  }

  function toggle(userId: number) {
    const current = pinned.value
    const next = current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId]
    save.mutate(next)
  }

  /** 置顶优先排序（稳定排序，未置顶项保持传入顺序） */
  function sortPinned<T>(items: T[], getId: (item: T) => number): T[] {
    const order = pinned.value
    if (order.length === 0) return items
    return [...items].sort((a, b) => {
      const ia = order.indexOf(getId(a))
      const ib = order.indexOf(getId(b))
      if (ia !== -1 && ib !== -1) return ia - ib
      if (ia !== -1) return -1
      if (ib !== -1) return 1
      return 0
    })
  }

  return { pinned, isPinned, toggle, sortPinned, pending: save.isPending }
}