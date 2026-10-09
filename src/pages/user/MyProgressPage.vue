<script setup lang="ts">
import { computed } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { RefreshCw } from '@lucide/vue'
import { Api } from '@/lib/api'
import { qk } from '@/lib/query'
import type { ProgressItem } from '@/lib/types'
import Button from '@/components/ui/Button.vue'
import Panel from '@/components/ui/Panel.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'

const qc = useQueryClient()
const { data, isLoading } = useQuery<ProgressItem[]>({
  queryKey: qk.user.progress,
  queryFn: () => Api<ProgressItem[]>('/api/user/me/progress'),
  refetchInterval: 15_000,
})

const games = computed(() => data.value ?? [])
const done = computed(() => games.value.filter((g) => g.checked_in).length)
const groups = computed(() => {
  const map = new Map<string, ProgressItem[]>()
  for (const g of games.value) {
    const key = g.group_name ?? '未分组'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(g)
  }
  return [...map.entries()]
})
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <div class="mb-3 flex justify-end">
      <Button variant="ghost" size="sm" @click="qc.invalidateQueries({ queryKey: qk.user.progress })">
        <RefreshCw />刷新
      </Button>
    </div>
    <Panel class="flex flex-col items-center gap-4 p-6">
      <Skeleton v-if="isLoading" class="h-24 w-full" />
      <template v-else>
        <div class="text-5xl">{{ done === games.length && games.length > 0 ? '🎉' : '🎮' }}</div>
        <p class="text-lg font-semibold tnum">已打卡 {{ done }} / {{ games.length }}</p>
        <p v-if="groups.length === 0" class="text-sm text-muted">暂无代肝记录</p>
        <div v-for="[name, list] in groups" :key="name" class="w-full">
          <p class="mb-2 text-xs font-medium text-dim">{{ name }}</p>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="g in list"
              :key="g.game_name"
              class="flex items-center gap-2 rounded-full border border-border py-1 pl-3 pr-1.5"
            >
              <span class="text-sm">{{ g.game_name }}</span>
              <StatusBadge :checked="g.checked_in" />
            </div>
          </div>
        </div>
      </template>
    </Panel>
  </div>
</template>