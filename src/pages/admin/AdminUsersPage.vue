<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { Pencil, Plus, Search, Trash2, X } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Api } from '@/lib/api'
import { qk } from '@/lib/query'
import type { AdminUser } from '@/lib/types'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import Modal from '@/components/ui/Modal.vue'
import Panel from '@/components/ui/Panel.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import Switch from '@/components/ui/Switch.vue'
import { useConfirm } from '@/composables/useConfirm'

const qc = useQueryClient()
const confirm = useConfirm()
const search = ref('')
const aliasDrafts = reactive<Record<number, string>>({})

const { data, isLoading } = useQuery<AdminUser[]>({
  queryKey: qk.admin.users,
  queryFn: () => Api<AdminUser[]>('/api/admin/users'),
})

const invalidate = () => qc.invalidateQueries({ queryKey: qk.admin.users })

const addAlias = useMutation({
  mutationFn: (vars: { id: number; alias: string }) =>
    Api(`/api/admin/users/${vars.id}/aliases`, {
      method: 'POST',
      body: JSON.stringify({ alias: vars.alias }),
    }),
  onSuccess: (_d, vars) => {
    toast.success('别名已添加')
    aliasDrafts[vars.id] = ''
    invalidate()
  },
  onError: (e: unknown) => toast.error(e instanceof Error ? e.message : '添加失败'),
})

async function removeAlias(id: number, alias: string) {
  try {
    await Api(`/api/admin/users/${id}/aliases/${encodeURIComponent(alias)}`, { method: 'DELETE' })
    toast.success('别名已删除')
    invalidate()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '删除失败')
  }
}

async function removeUser(u: AdminUser) {
  const ok = await confirm({
    title: '删除用户',
    message: `确认删除用户「${u.name}」及其数据？`,
    confirmText: '删除',
    danger: true,
  })
  if (!ok) return
  try {
    await Api(`/api/admin/users/${u.id}`, { method: 'DELETE' })
    toast.success('用户已删除')
    invalidate()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '删除失败')
  }
}

const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = data.value ?? []
  if (!q) return list
  return list.filter(
    (u) =>
      String(u.id).includes(q) ||
      u.name.toLowerCase().includes(q) ||
      u.aliases.some((a) => a.toLowerCase().includes(q)),
  )
})

/* 新增 */
const addOpen = ref(false)
const addName = ref('')
const { mutate: createUser, isPending: creating } = useMutation({
  mutationFn: () => Api('/api/admin/users', { method: 'POST', body: JSON.stringify({ name: addName.value.trim() }) }),
  onSuccess: () => {
    toast.success('用户已创建')
    addOpen.value = false
    addName.value = ''
    invalidate()
  },
  onError: (e: unknown) => toast.error(e instanceof Error ? e.message : '创建失败'),
})

/* 编辑 */
const editing = ref<AdminUser | null>(null)
const form = reactive({ name: '', qq: '', email: '', disabled: false, moveAlias: false })
watch(editing, (u) => {
  if (!u) return
  form.name = u.name
  form.qq = u.qq_id != null ? String(u.qq_id) : ''
  form.email = u.email ?? ''
  form.disabled = u.login_disabled
  form.moveAlias = false
})
const { mutate: saveUser, isPending: saving } = useMutation({
  mutationFn: () => {
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      login_disabled: form.disabled,
      move_old_to_alias: form.moveAlias,
      email: form.email.trim(),
    }
    if (form.qq.trim()) body.qq_id = Number(form.qq.trim())
    return Api(`/api/admin/users/${editing.value?.id}`, { method: 'PATCH', body: JSON.stringify(body) })
  },
  onSuccess: () => {
    toast.success('已保存')
    editing.value = null
    invalidate()
  },
  onError: (e: unknown) => toast.error(e instanceof Error ? e.message : '保存失败'),
})
</script>

<template>
  <div class="mx-auto flex max-w-4xl flex-col gap-3">
    <div class="flex items-center gap-2">
      <div class="relative min-w-40 flex-1">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
        <Input v-model="search" class="pl-9" placeholder="搜索 ID / 用户名 / 别名" />
      </div>
      <Button variant="primary" @click="addOpen = true"><Plus />新建用户</Button>
    </div>

    <Skeleton v-if="isLoading" class="h-40 w-full" />
    <EmptyState v-else-if="visible.length === 0" title="暂无用户" />
    <Panel v-for="u in visible" v-else :key="u.id" class="anim-fade-up p-4">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <h3 class="truncate font-semibold">{{ u.name }}</h3>
        <span class="rounded-full border border-border px-2 py-0.5 text-xs text-dim tnum">#{{ u.id }}</span>
        <Badge v-if="u.role === 'admin'" variant="accent">管理员</Badge>
        <Badge v-if="u.login_disabled" variant="danger">已停用</Badge>
        <Badge v-if="!u.email_verified && u.email" variant="muted">邮箱未验证</Badge>
        <div class="ml-auto flex gap-1">
          <Button variant="outline" size="icon" aria-label="编辑" @click="editing = u"><Pencil /></Button>
          <Button variant="outline" size="icon" aria-label="删除" @click="removeUser(u)"><Trash2 /></Button>
        </div>
      </div>
      <div class="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <span>QQ：{{ u.qq_id ?? '未绑定' }}</span>
        <span>邮箱：{{ u.email ?? '未绑定' }}</span>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span
          v-for="a in u.aliases"
          :key="a"
          class="flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs"
        >
          {{ a }}
          <button type="button" aria-label="删除别名" @click="removeAlias(u.id, a)"><X class="h-3 w-3" /></button>
        </span>
        <Input
          v-model="aliasDrafts[u.id]"
          class="h-8 w-32 text-sm"
          placeholder="添加别名"
          @keydown.enter="aliasDrafts[u.id]?.trim() && addAlias.mutate({ id: u.id, alias: aliasDrafts[u.id]!.trim() })"
        />
        <Button
          size="sm"
          variant="ghost"
          :disabled="!aliasDrafts[u.id]?.trim()"
          @click="addAlias.mutate({ id: u.id, alias: aliasDrafts[u.id]!.trim() })"
        >
          添加
        </Button>
      </div>
    </Panel>

    <Modal v-model:open="addOpen" title="新建用户" description="创建后可在用户端通过验证码登录" class="sm:max-w-sm">
      <div><Label>用户名</Label><Input v-model="addName" /></div>
      <template #footer>
        <Button variant="ghost" @click="addOpen = false">取消</Button>
        <Button variant="primary" :disabled="creating || !addName.trim()" @click="createUser()">创建</Button>
      </template>
    </Modal>

    <Modal
      :open="!!editing"
      title="编辑用户"
      class="sm:max-w-sm"
      @update:open="(v: boolean) => { if (!v) editing = null }"
    >
      <div class="flex flex-col gap-3">
        <div>
          <Label>用户名</Label>
          <Input v-model="form.name" />
          <label class="mt-1 flex items-center gap-2 text-xs text-dim">
            <Switch v-model="form.moveAlias" />旧用户名保留为别名
          </label>
        </div>
        <div>
          <Label>QQ 号</Label>
          <Input v-model="form.qq" inputmode="numeric" placeholder="留空表示不修改" />
        </div>
        <div>
          <Label>邮箱</Label>
          <Input v-model="form.email" placeholder="修改后自动标记为已验证" />
        </div>
        <label class="flex items-center justify-between gap-2">
          <span class="text-sm">停用 WebUI 登录</span>
          <Switch v-model="form.disabled" :disabled="editing?.role === 'admin'" />
        </label>
      </div>
      <template #footer>
        <Button variant="ghost" @click="editing = null">取消</Button>
        <Button variant="primary" :disabled="saving" @click="saveUser()">保存</Button>
      </template>
    </Modal>
  </div>
</template>