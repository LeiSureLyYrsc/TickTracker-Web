<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { CheckCheck, MailOpen } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Api } from '@/lib/api'
import { qk } from '@/lib/query'
import { formatDateTime } from '@/lib/format'
import type { Message } from '@/lib/types'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Panel from '@/components/ui/Panel.vue'
import Skeleton from '@/components/ui/Skeleton.vue'

const qc = useQueryClient()
const unreadOnly = ref(false)

const { data, isLoading } = useQuery<Message[]>({
  queryKey: computed(() => [...qk.admin.messages, unreadOnly.value]),
  queryFn: () => Api<Message[]>(`/api/admin/messages?unread_only=${unreadOnly.value}`),
})

const { mutate: markRead } = useMutation({
  mutationFn: (id: number) => Api(`/api/admin/messages/${id}/read`, { method: 'PATCH' }),
  onSuccess: () => {
    toast.success('已标记为已读')
    qc.invalidateQueries({ queryKey: qk.admin.messages })
  },
  onError: (e: unknown) => toast.error(e instanceof Error ? e.message : '操作失败'),
})
</script>

<template>
  <div class="mx-auto flex max-w-3xl flex-col gap-3">
    <div class="flex items-center justify-between">
      <span class="text-sm text-muted tnum">共 {{ data?.length ?? 0 }} 条</span>
      <Button :variant="unreadOnly ? 'subtle' : 'ghost'" size="sm" @click="unreadOnly = !unreadOnly">
        <MailOpen />{{ unreadOnly ? '仅看未读' : '全部' }}
      </Button>
    </div>
    <Skeleton v-if="isLoading" class="h-40 w-full" />
    <EmptyState v-else-if="!data?.length" title="暂无留言" />
    <Panel v-for="m in data" :key="m.id" class="p-4">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-medium">{{ m.user_name }}</span>
        <span class="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-dim">{{ m.game_name }}</span>
        <Badge :variant="m.is_read ? 'muted' : 'accent'">{{ m.is_read ? '已读' : '未读' }}</Badge>
        <span class="ml-auto text-xs text-dim">{{ formatDateTime(m.created_at) }}</span>
      </div>
      <p class="mt-2 whitespace-pre-wrap text-sm">{{ m.content }}</p>
      <Button v-if="!m.is_read" variant="subtle" size="sm" class="mt-2" @click="markRead(m.id)">
        <CheckCheck />标记已读
      </Button>
    </Panel>
  </div>
</template>