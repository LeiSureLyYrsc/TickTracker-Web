<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { Pin, RefreshCw, Search, Users } from '@lucide/vue'
import { Api } from '@/lib/api'
import { qk } from '@/lib/query'
import type { Commission } from '@/lib/types'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Panel from '@/components/ui/Panel.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { usePinnedUsers } from '@/composables/usePinnedUsers'

const qc = useQueryClient()
const { isPinned, toggle: togglePin, sortPinned } = usePinnedUsers()
const search = ref('')
const { data, isLoading } = useQuery<Commission[]>({
  queryKey: qk.admin.commissions,
  queryFn: () => Api<Commission[]>('/api/admin/commissions'),
  refetchInterval: 20_000,
})

const groups = computed(() => {
  const map = new Map<number, { user_id: number; name: string; list: Commission[]; done: number }>()
  for (const r of data.value ?? []) {
    if (!map.has(r.user_id)) {
      map.set(r.user_id, { user_id: r.user_id, name: r.user_name, list: [], done: 0 })
    }
    const g = map.get(r.user_id)!
    g.list.push(r)
    if (r.checked_in) g.done += 1
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
})

const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  const matched = q ? groups.value.filter((g) => g.name.toLowerCase().includes(q)) : groups.value
  // 置顶用户排最前
  return sortPinned(matched, (g) => g.user_id)
})
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-3">
    <div class="flex items-center gap-2">
      <div class="relative min-w-40 flex-1">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
        <Input v-model="search" class="pl-9" placeholder="搜索用户名" />
      </div>
      <Button variant="ghost" size="icon" aria-label="刷新" @click="qc.invalidateQueries({ queryKey: qk.admin.commissions })">
        <RefreshCw />
      </Button>
    </div>

    <div v-if="isLoading" class="grid gap-3 md:grid-cols-2">
      <Skeleton class="h-40 w-full" />
      <Skeleton class="h-40 w-full" />
    </div>
    <EmptyState v-else-if="visible.length === 0" :title="search ? '无匹配用户' : '暂无数据'">
      <template #icon><Users class="h-8 w-8 text-dim" /></template>
    </EmptyState>
    <div v-else class="grid gap-3 md:grid-cols-2">
      <Panel v-for="g in visible" :key="g.user_id" class="anim-fade-up p-4">
        <div class="mb-2 flex items-center justify-between gap-2">
          <h3 class="truncate font-semibold">{{ g.name }}</h3>
          <div class="flex shrink-0 items-center gap-1">
            <button
              type="button"
              class="rounded-md p-1 transition-colors"
              :class="isPinned(g.user_id) ? 'text-accent' : 'text-dim hover:text-text'"
              :aria-label="isPinned(g.user_id) ? '取消置顶' : '置顶到最前'"
              :title="isPinned(g.user_id) ? '取消置顶' : '置顶到最前'"
              @click="togglePin(g.user_id)"
            >
              <Pin class="h-4 w-4" />
            </button>
            <span class="rounded-full border border-accent/30 bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent tnum">
              {{ g.done }}/{{ g.list.length }}
            </span>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="r in g.list"
            :key="r.id"
            class="flex items-center gap-2 rounded-full border border-border py-1 pl-3 pr-1.5"
          >
            <span class="text-sm">{{ r.game_name }}</span>
            <StatusBadge :checked="r.checked_in" />
          </div>
        </div>
      </Panel>
    </div>
  </div>
</template>