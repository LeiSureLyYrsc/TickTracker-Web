<script setup lang="ts">
import { ref, watch } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { BellPlus, RotateCcw, Save, Trash2 } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Api } from '@/lib/api'
import { qk } from '@/lib/query'
import type { ReminderSetting } from '@/lib/types'
import Button from '@/components/ui/Button.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import Modal from '@/components/ui/Modal.vue'
import Panel from '@/components/ui/Panel.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import Switch from '@/components/ui/Switch.vue'
import Textarea from '@/components/ui/Textarea.vue'
import { useConfirm } from '@/composables/useConfirm'

const qc = useQueryClient()
const confirm = useConfirm()

const { data, isLoading } = useQuery<ReminderSetting[]>({
  queryKey: qk.admin.reminders,
  queryFn: () => Api<ReminderSetting[]>('/api/admin/reminders'),
})
const { data: templateData } = useQuery<{ template: string }>({
  queryKey: qk.admin.template,
  queryFn: () => Api<{ template: string }>('/api/admin/reminders/template'),
})
const template = ref('')
watch(templateData, (d) => {
  if (d) template.value = d.template
})

const patch = useMutation({
  mutationFn: (vars: { userId: number; enabled?: boolean; push_time?: string }) =>
    Api(`/api/admin/reminders/${vars.userId}`, { method: 'PATCH', body: JSON.stringify({ enabled: vars.enabled, push_time: vars.push_time }) }),
  onSuccess: () => qc.invalidateQueries({ queryKey: qk.admin.reminders }),
  onError: (e: unknown) => toast.error(e instanceof Error ? e.message : '保存失败'),
})

const saveTemplate = useMutation({
  mutationFn: () => Api<{ template: string }>('/api/admin/reminders/template', { method: 'PUT', body: JSON.stringify({ template: template.value }) }),
  onSuccess: (d) => {
    toast.success('模板已保存')
    qc.setQueryData(qk.admin.template, d)
  },
  onError: (e: unknown) => toast.error(e instanceof Error ? e.message : '保存失败'),
})

const resetTemplate = useMutation({
  mutationFn: () => Api<{ template: string }>('/api/admin/reminders/template/reset', { method: 'POST' }),
  onSuccess: (d) => {
    toast.success('已重置为默认模板')
    template.value = d.template
    qc.setQueryData(qk.admin.template, d)
  },
})

async function remove(r: ReminderSetting) {
  const ok = await confirm({ title: '删除提醒', message: `删除 ${r.user_name} 的提醒设置？`, confirmText: '删除', danger: true })
  if (!ok) return
  try {
    await Api(`/api/admin/reminders/${r.user_id}`, { method: 'DELETE' })
    toast.success('已删除')
    qc.invalidateQueries({ queryKey: qk.admin.reminders })
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '删除失败')
  }
}

const addOpen = ref(false)
const addForm = ref({ userName: '', time: '22:00' })
const { mutate: addReminder, isPending: adding } = useMutation({
  mutationFn: () => Api('/api/admin/reminders', { method: 'POST', body: JSON.stringify({ user_name: addForm.value.userName.trim(), push_time: addForm.value.time, enabled: true }) }),
  onSuccess: () => {
    toast.success('已保存')
    addOpen.value = false
    addForm.value = { userName: '', time: '22:00' }
    qc.invalidateQueries({ queryKey: qk.admin.reminders })
  },
  onError: (e: unknown) => toast.error(e instanceof Error ? e.message : '保存失败'),
})
</script>

<template>
  <div class="mx-auto flex max-w-3xl flex-col gap-3">
    <Panel class="p-4">
      <h2 class="mb-3 font-semibold">推送模板</h2>
      <Textarea v-model="template" :rows="5" />
      <p class="mt-2 text-xs text-dim">
        可用占位符：{name} {done} {total} {groups} {list} {note}
      </p>
      <div class="mt-3 flex gap-2">
        <Button variant="subtle" :disabled="saveTemplate.isPending.value" @click="saveTemplate.mutate()"><Save />保存模板</Button>
        <Button variant="outline" @click="resetTemplate.mutate()"><RotateCcw />恢复默认</Button>
      </div>
    </Panel>

    <div class="flex items-center justify-between">
      <h3 class="px-1 text-sm font-medium text-dim">用户提醒（{{ data?.length ?? 0 }}）</h3>
      <Button variant="subtle" size="sm" @click="addOpen = true"><BellPlus />添加/修改</Button>
    </div>

    <Skeleton v-if="isLoading" class="h-40 w-full" />
    <EmptyState v-else-if="!data?.length" title="暂无提醒设置" />
    <Panel v-for="r in data" v-else :key="r.user_id" class="anim-fade-up p-4">
      <div class="flex flex-wrap items-center gap-3">
        <div class="min-w-32">
          <p class="font-medium">{{ r.user_name }}</p>
          <p class="text-xs text-dim">QQ {{ r.qq_id ?? '未绑定' }}</p>
        </div>
        <Input
          class="w-32"
          type="time"
          :model-value="r.push_time"
          @update:model-value="(v: string | number) => { const s = String(v); if (s && s !== r.push_time) patch.mutate({ userId: r.user_id, push_time: s }) }"
        />
        <label class="flex items-center gap-2 text-sm">
          <Switch
            :model-value="r.enabled"
            @update:model-value="(v: boolean) => patch.mutate({ userId: r.user_id, enabled: v })"
          />
          启用
        </label>
        <Button variant="outline" size="icon" class="ml-auto" aria-label="删除" @click="remove(r)"><Trash2 /></Button>
      </div>
    </Panel>

    <Modal v-model:open="addOpen" title="添加/修改提醒" class="sm:max-w-sm">
      <div class="flex flex-col gap-3">
        <div><Label>用户名 / 别名</Label><Input v-model="addForm.userName" /></div>
        <div><Label>推送时间</Label><Input v-model="addForm.time" type="time" /></div>
      </div>
      <template #footer>
        <Button variant="ghost" @click="addOpen = false">取消</Button>
        <Button variant="primary" :disabled="adding || !addForm.userName.trim()" @click="addReminder()">保存</Button>
      </template>
    </Modal>
  </div>
</template>