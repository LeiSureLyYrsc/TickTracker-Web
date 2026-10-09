<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { Send } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Api } from '@/lib/api'
import { qk } from '@/lib/query'
import { formatDateTime } from '@/lib/format'
import type { MyMessage, UserGame } from '@/lib/types'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Label from '@/components/ui/Label.vue'
import Panel from '@/components/ui/Panel.vue'
import Select from '@/components/ui/Select.vue'
import Textarea from '@/components/ui/Textarea.vue'

const qc = useQueryClient()
const gameName = ref('')
const content = ref('')

const { data: games } = useQuery<UserGame[]>({
  queryKey: qk.user.games,
  queryFn: () => Api<UserGame[]>('/api/user/games'),
})
const { data: messages } = useQuery<MyMessage[]>({
  queryKey: qk.user.messages,
  queryFn: () => Api<MyMessage[]>('/api/user/me/messages'),
})

const gameOptions = computed(() =>
  (games.value ?? []).map((g) => ({
    value: g.name,
    label: g.group_name ? `${g.group_name} / ${g.name}` : g.name,
  })),
)

const { mutate: send, isPending } = useMutation({
  mutationFn: () =>
    Api('/api/user/me/messages', {
      method: 'POST',
      body: JSON.stringify({ game_name: gameName.value, content: content.value.trim() }),
    }),
  onSuccess: () => {
    toast.success('留言已发送')
    content.value = ''
    qc.invalidateQueries({ queryKey: qk.user.messages })
  },
  onError: (e: unknown) => toast.error(e instanceof Error ? e.message : '发送失败'),
})

function submit() {
  if (!gameName.value) return toast.error('请选择游戏')
  if (!content.value.trim()) return toast.error('请输入留言内容')
  send()
}
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-3">
    <Panel class="p-4">
      <h2 class="mb-3 font-semibold">发送留言</h2>
      <div class="flex flex-col gap-3">
        <div>
          <Label>选择游戏</Label>
          <Select v-model="gameName" :options="gameOptions" placeholder="仅可选择你已绑定的游戏" />
        </div>
        <div>
          <Label>内容</Label>
          <Textarea v-model="content" rows="4" />
        </div>
        <Button variant="primary" class="self-start" :disabled="isPending" @click="submit">
          <Send />发送
        </Button>
      </div>
    </Panel>

    <h3 class="px-1 text-sm font-medium text-dim">历史留言</h3>
    <EmptyState v-if="!messages?.length" title="暂无留言" />
    <Panel v-for="m in messages" :key="m.id" class="p-3">
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm font-medium">{{ m.game_name }}</span>
        <div class="flex items-center gap-2">
          <Badge :variant="m.is_read ? 'muted' : 'accent'">{{ m.is_read ? '已读' : '未读' }}</Badge>
          <span class="text-xs text-dim">{{ formatDateTime(m.created_at) }}</span>
        </div>
      </div>
      <p class="mt-1 whitespace-pre-wrap text-sm text-muted">{{ m.content }}</p>
    </Panel>
  </div>
</template>