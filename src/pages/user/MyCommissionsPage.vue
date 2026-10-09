<script setup lang="ts">
import { computed } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { FolderOpen, RefreshCw } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Api } from '@/lib/api'
import { qk } from '@/lib/query'
import { formatDateTime } from '@/lib/format'
import type { GroupDue, MyCommission } from '@/lib/types'
import Button from '@/components/ui/Button.vue'
import Panel from '@/components/ui/Panel.vue'
import Progress from '@/components/ui/Progress.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import CheckinButton from '@/components/common/CheckinButton.vue'

const qc = useQueryClient()

const { data: commissions, isLoading } = useQuery<MyCommission[]>({
  queryKey: qk.user.commissions,
  queryFn: () => Api<MyCommission[]>('/api/user/me/commissions'),
})
const { data: dues } = useQuery<GroupDue[]>({
  queryKey: qk.user.groupCommissions,
  queryFn: () => Api<GroupDue[]>('/api/user/me/group-commissions'),
})
const { data: note } = useQuery<{ content: string }>({
  queryKey: qk.user.note,
  queryFn: () => Api<{ content: string }>('/api/user/me/note'),
})

const { mutate: checkin, isPending, variables } = useMutation({
  mutationFn: (gameId: number) =>
    Api('/api/user/me/checkin', {
      method: 'POST',
      body: JSON.stringify({ game_id: gameId, count: 1 }),
    }),
  onMutate: async (gameId: number) => {
    await qc.cancelQueries({ queryKey: qk.user.commissions })
    const prev = qc.getQueryData<MyCommission[]>(qk.user.commissions)
    qc.setQueryData<MyCommission[]>(qk.user.commissions, (old) =>
      old?.map((c) =>
        c.game_id === gameId
          ? {
              ...c,
              completed_count: c.completed_count + 1,
              checked_in: true,
              last_checked_in_at: new Date().toISOString(),
            }
          : c,
      ),
    )
    return { prev }
  },
  onError: (e: unknown, _gameId, ctx: { prev?: MyCommission[] } | undefined) => {
    if (ctx?.prev) qc.setQueryData(qk.user.commissions, ctx.prev)
    toast.error(e instanceof Error ? e.message : '打卡失败')
  },
  onSuccess: () => toast.success('打卡成功'),
  onSettled: () => {
    qc.invalidateQueries({ queryKey: qk.user.commissions })
    qc.invalidateQueries({ queryKey: qk.user.progress })
    qc.invalidateQueries({ queryKey: qk.admin.commissions })
  },
})

interface GroupView {
  key: string
  name: string
  total: number | null
  games: MyCommission[]
}

const groups = computed<GroupView[]>(() => {
  const map = new Map<string, GroupView>()
  for (const c of commissions.value ?? []) {
    const key = c.group_id == null ? 'ungrouped' : String(c.group_id)
    if (!map.has(key)) {
      map.set(key, { key, name: c.group_name ?? '未分组', total: null, games: [] })
    }
    map.get(key)!.games.push(c)
  }
  for (const d of dues.value ?? []) {
    const g = map.get(String(d.game_group_id))
    if (g) g.total = d.total_count
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
})
</script>

<template>
  <div class="mx-auto flex max-w-4xl flex-col gap-3">
    <div
      v-if="note?.content"
      class="rounded-xl border border-accent/40 bg-accent/10 p-4 text-text"
    >
      <p class="mb-1 text-sm font-semibold text-accent">今日备注</p>
      <p class="whitespace-pre-wrap text-sm leading-relaxed">{{ note.content }}</p>
    </div>

    <div class="flex items-center justify-between">
      <span class="text-sm text-muted">共 {{ groups.length }} 个游戏组</span>
      <Button variant="ghost" size="sm" @click="qc.invalidateQueries({ queryKey: qk.user.root })">
        <RefreshCw />刷新
      </Button>
    </div>

    <div v-if="isLoading" class="grid gap-3 md:grid-cols-2">
      <Skeleton class="h-40 w-full" />
      <Skeleton class="h-40 w-full" />
    </div>
    <EmptyState v-else-if="groups.length === 0" title="暂无代肝记录" hint="请联系管理员为你的账号添加游戏">
      <template #icon><FolderOpen class="h-8 w-8 text-dim" /></template>
    </EmptyState>
    <div v-else class="grid gap-3 md:grid-cols-2">
      <Panel v-for="g in groups" :key="g.key" class="anim-fade-up p-4">
        <div class="mb-2 flex items-center justify-between gap-2">
          <h3 class="flex min-w-0 items-center gap-2 font-semibold">
            <FolderOpen class="h-5 w-5 shrink-0 text-accent" />
            <span class="truncate">{{ g.name }}</span>
          </h3>
          <span
            v-if="g.total != null"
            class="shrink-0 rounded-full border border-accent/30 bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent tnum"
          >
            应得 {{ g.total }}
          </span>
        </div>
        <Progress
          v-if="g.total != null"
          class="mb-2"
          :value="g.games.reduce((s, c) => s + c.completed_count, 0)"
          :max="g.total"
        />
        <div class="flex flex-col divide-y divide-border">
          <div
            v-for="c in g.games"
            :key="c.id"
            class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0">
              <p class="truncate font-medium">{{ c.game_name }}</p>
              <p class="text-xs text-dim tnum">
                已完成 {{ c.completed_count }}
                <template v-if="c.last_checked_in_at"> · 最后 {{ formatDateTime(c.last_checked_in_at) }}</template>
              </p>
            </div>
            <div class="flex items-center justify-between gap-2 sm:justify-end">
              <StatusBadge :checked="c.checked_in" />
              <CheckinButton
                :checked="c.checked_in"
                :pending="isPending && variables === c.game_id"
                @click="checkin(c.game_id)"
              />
            </div>
          </div>
        </div>
      </Panel>
    </div>
  </div>
</template>