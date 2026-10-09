<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { RefreshCw, Search } from '@lucide/vue'
import { Api } from '@/lib/api'
import { qk } from '@/lib/query'
import { formatDateTime } from '@/lib/format'
import type { AuditLog } from '@/lib/types'
import Button from '@/components/ui/Button.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Input from '@/components/ui/Input.vue'
import Panel from '@/components/ui/Panel.vue'
import Skeleton from '@/components/ui/Skeleton.vue'

const search = ref('')
const q = ref('')
const { data, isLoading, refetch } = useQuery<AuditLog[]>({
  queryKey: computed(() => [...qk.admin.audit, q.value]),
  queryFn: () => Api<AuditLog[]>(`/api/admin/audit-logs?limit=200&q=${encodeURIComponent(q.value)}`),
})
</script>

<template>
  <div class="mx-auto flex max-w-4xl flex-col gap-3">
    <div class="flex items-center gap-2">
      <div class="relative min-w-40 flex-1">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
        <Input v-model="search" class="pl-9" placeholder="搜索操作者 / 动作 / 目标 / IP" @keydown.enter="q = search.trim()" />
      </div>
      <Button variant="subtle" @click="q = search.trim()">搜索</Button>
      <Button variant="ghost" size="icon" aria-label="刷新" @click="refetch()"><RefreshCw /></Button>
    </div>
    <Skeleton v-if="isLoading" class="h-64 w-full" />
    <EmptyState v-else-if="!data?.length" title="暂无日志" />
    <Panel v-for="l in data" :key="l.id" class="p-3 text-sm">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-medium">{{ l.action }}</span>
        <span class="text-xs text-dim">{{ l.actor_type }} · {{ l.actor_name }}</span>
        <span class="ml-auto text-xs text-dim">{{ formatDateTime(l.created_at) }}</span>
      </div>
      <p v-if="l.target" class="mt-1 text-muted">目标：{{ l.target }}</p>
      <p v-if="l.detail" class="text-muted">详情：{{ l.detail }}</p>
      <p v-if="l.ip" class="text-xs text-dim">IP：{{ l.ip }}</p>
    </Panel>
  </div>
</template>