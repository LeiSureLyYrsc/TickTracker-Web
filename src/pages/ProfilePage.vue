<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { BellRing, KeyRound, Link2, Mail, Trash2, Upload, UserRound } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Api, apiFetch, readError } from '@/lib/api'
import { qk } from '@/lib/query'
import { registerPasskey } from '@/lib/webauthn'
import { formatDate } from '@/lib/format'
import { bumpAvatar, buildAvatarUrl } from '@/lib/avatar'
import type { MyReminder, PasskeyItem, Profile, SsoBinding } from '@/lib/types'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import Panel from '@/components/ui/Panel.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import Switch from '@/components/ui/Switch.vue'

interface Provider {
  id: string
  name: string
  icon: string
  icon_url?: string | null
}

const qc = useQueryClient()
const fileInput = ref<HTMLInputElement | null>(null)

const { data: profile, isLoading } = useQuery<Profile>({
  queryKey: qk.profile,
  queryFn: () => Api<Profile>('/api/me/profile'),
})

const { data: passkeys } = useQuery<PasskeyItem[]>({
  queryKey: qk.passkeys,
  queryFn: () => Api<PasskeyItem[]>('/api/passkey/credentials'),
  enabled: () => !!profile.value?.passkey_enabled,
})

const { data: reminder } = useQuery<MyReminder>({
  queryKey: qk.user.reminder,
  queryFn: () => Api<MyReminder>('/api/user/me/reminder'),
  enabled: () => profile.value?.role === 'user',
})

const { data: providers } = useQuery<Provider[]>({
  queryKey: qk.oidcProviders,
  queryFn: () => fetch('/api/oidc/providers').then((r) => (r.ok ? r.json() : [])),
  enabled: () => !!profile.value?.oidc_enabled,
})

const { data: bindings } = useQuery<SsoBinding[]>({
  queryKey: qk.oidcBindings,
  queryFn: () => Api<SsoBinding[]>('/api/oidc/my-bindings'),
  enabled: () => !!profile.value?.oidc_enabled,
})

const oldPw = ref('')
const newPw = ref('')
const confirmPw = ref('')
const bindEmail = ref('')
const bindCode = ref('')
const bindSent = ref(false)
const time = ref('22:00')

watch(reminder, (r) => {
  if (r) time.value = r.push_time
})

const invalidateProfile = () => qc.invalidateQueries({ queryKey: qk.profile })

const changePw = useMutation({
  mutationFn: () =>
    Api('/api/me/password', {
      method: 'POST',
      body: JSON.stringify({ old_password: oldPw.value, new_password: newPw.value }),
    }),
  onSuccess: () => {
    toast.success('密码已更新')
    oldPw.value = ''
    newPw.value = ''
    confirmPw.value = ''
    invalidateProfile()
  },
  onError: (e) => toast.error(e instanceof Error ? e.message : '修改失败'),
})

const saveReminder = useMutation({
  mutationFn: (patch: { enabled?: boolean; push_time?: string }) =>
    Api<MyReminder>('/api/user/me/reminder', { method: 'PUT', body: JSON.stringify(patch) }),
  onSuccess: (data) => {
    toast.success(data.enabled ? '提醒已启用' : '提醒已关闭')
    qc.setQueryData(qk.user.reminder, data)
    time.value = data.push_time
  },
  onError: (e) => toast.error(e instanceof Error ? e.message : '保存失败'),
})

const addPasskey = useMutation({
  mutationFn: registerPasskey,
  onSuccess: () => {
    toast.success('通行密钥已添加')
    qc.invalidateQueries({ queryKey: qk.passkeys })
  },
  onError: (e) => toast.error(e instanceof Error ? e.message : '添加失败'),
})

async function deletePasskey(id: number) {
  try {
    await Api(`/api/passkey/credentials/${id}`, { method: 'DELETE' })
    toast.success('通行密钥已删除')
    qc.invalidateQueries({ queryKey: qk.passkeys })
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '删除失败')
  }
}

async function onAvatar(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const form = new FormData()
  form.append('file', file)
  const res = await apiFetch('/api/me/avatar', { method: 'POST', body: form })
  if (res.ok) {
    toast.success('头像已更新')
    bumpAvatar()
    invalidateProfile()
  } else {
    toast.error(await readError(res))
  }
}

async function removeAvatar() {
  const res = await apiFetch('/api/me/avatar', { method: 'DELETE' })
  if (res.ok) {
    toast.success('头像已删除')
    bumpAvatar()
    invalidateProfile()
  } else {
    toast.error(await readError(res))
  }
}

async function sendBindCode() {
  if (!bindEmail.value.includes('@')) return toast.error('请输入有效邮箱')
  try {
    await Api('/api/me/email/bind', {
      method: 'POST',
      body: JSON.stringify({ email: bindEmail.value.trim() }),
    })
    bindSent.value = true
    toast.success('验证码已发送')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '发送失败')
  }
}

async function verifyBind() {
  try {
    await Api('/api/me/email/verify', {
      method: 'POST',
      body: JSON.stringify({ email: bindEmail.value.trim(), code: bindCode.value.trim() }),
    })
    toast.success('邮箱绑定成功')
    bindEmail.value = ''
    bindCode.value = ''
    bindSent.value = false
    invalidateProfile()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '验证失败')
  }
}

async function linkSso(id: string) {
  try {
    const data = await Api<{ url: string }>(`/api/oidc/link/start/${id}`, { method: 'POST' })
    window.location.href = data.url
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '绑定失败')
  }
}

async function unlinkSso(id: string) {
  try {
    await Api(`/api/oidc/bindings/${id}`, { method: 'DELETE' })
    toast.success('已解绑')
    qc.invalidateQueries({ queryKey: qk.oidcBindings })
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '解绑失败')
  }
}

function submitPassword() {
  if (newPw.value.length < 6) return toast.error('新密码至少 6 位')
  if (newPw.value !== confirmPw.value) return toast.error('两次输入不一致')
  if (profile.value?.password_set && !oldPw.value) return toast.error('请输入原密码')
  changePw.mutate()
}

const avatarSrc = computed(() => buildAvatarUrl(profile.value) ?? undefined)
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-3">
    <Skeleton v-if="isLoading || !profile" class="h-64 w-full" />
    <template v-else>
      <Panel class="p-4">
        <h2 class="mb-3 flex items-center gap-2 font-semibold">
          <UserRound class="h-5 w-5 text-accent" />账户信息
        </h2>
        <div class="flex items-center gap-4">
          <span
            class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-accent-2 to-accent text-xl font-semibold text-accent-fg"
          >
            <img v-if="avatarSrc" :src="avatarSrc" :alt="profile.name" class="h-full w-full object-cover" />
            <template v-else>{{ profile.name.charAt(0) }}</template>
          </span>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="truncate text-lg font-semibold">{{ profile.name }}</span>
              <Badge :variant="profile.role === 'admin' ? 'accent' : 'muted'">
                {{ profile.role === 'admin' ? '管理员' : '用户' }}
              </Badge>
            </div>
            <p class="truncate text-sm text-muted">
              <template v-if="profile.role === 'user'">
                ID {{ profile.user_id ?? '-' }} · QQ {{ profile.qq_id ?? '未绑定' }}
              </template>
              <template v-if="profile.email">
                · {{ profile.email }}{{ profile.email_verified ? '（已验证）' : '（未验证）' }}
              </template>
            </p>
          </div>
        </div>
      </Panel>

      <Panel class="p-4">
        <h2 class="mb-3 font-semibold">头像设置</h2>
        <div class="flex flex-wrap items-center gap-3">
          <span
            class="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-2xl font-semibold text-muted"
          >
            <img v-if="avatarSrc" :src="avatarSrc" :alt="profile.name" class="h-full w-full object-cover" />
            <template v-else>{{ profile.name.charAt(0) }}</template>
          </span>
          <Button v-if="profile.avatar_upload_allowed" variant="subtle" @click="fileInput?.click()">
            <Upload />上传头像
          </Button>
          <input
            ref="fileInput"
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            class="hidden"
            @change="onAvatar"
          />
          <Button v-if="profile.has_avatar" variant="outline" @click="removeAvatar">
            <Trash2 />删除头像
          </Button>
        </div>
      </Panel>

      <Panel v-if="profile.allow_email_binding" class="p-4">
        <h2 class="mb-3 flex items-center gap-2 font-semibold">
          <Mail class="h-5 w-5 text-accent" />邮箱绑定
        </h2>
        <div v-if="profile.email" class="flex items-center gap-2">
          <span>{{ profile.email }}</span>
          <Badge :variant="profile.email_verified ? 'success' : 'muted'">
            {{ profile.email_verified ? '已验证' : '未验证' }}
          </Badge>
        </div>
        <div v-else class="flex flex-col gap-3">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div class="flex-1">
              <Label>邮箱地址</Label>
              <Input v-model="bindEmail" />
            </div>
            <Button variant="subtle" :disabled="bindSent" @click="sendBindCode">
              {{ bindSent ? '已发送' : '发送验证码' }}
            </Button>
          </div>
          <div v-if="bindSent" class="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div class="flex-1">
              <Label>邮箱验证码</Label>
              <Input v-model="bindCode" />
            </div>
            <Button variant="primary" @click="verifyBind">验证并绑定</Button>
          </div>
        </div>
      </Panel>

      <Panel v-if="profile.oidc_enabled && (providers?.length ?? 0) > 0" class="p-4">
        <h2 class="mb-3 flex items-center gap-2 font-semibold">
          <Link2 class="h-5 w-5 text-accent" />SSO 绑定
        </h2>
        <div class="flex flex-col gap-2">
          <div
            v-for="p in providers"
            :key="p.id"
            class="flex items-center justify-between gap-2"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium">{{ p.name }}</p>
              <p
                v-if="bindings?.find((b) => b.provider_id === p.id)?.email"
                class="truncate text-xs text-dim"
              >
                {{ bindings?.find((b) => b.provider_id === p.id)?.email }}
              </p>
            </div>
            <Button
              v-if="bindings?.some((b) => b.provider_id === p.id)"
              variant="outline"
              size="sm"
              @click="unlinkSso(p.id)"
            >
              解绑
            </Button>
            <Button v-else variant="subtle" size="sm" @click="linkSso(p.id)">绑定</Button>
          </div>
        </div>
      </Panel>

      <Panel v-if="profile.role === 'user'" class="p-4">
        <h2 class="mb-3 flex items-center gap-2 font-semibold">
          <BellRing class="h-5 w-5 text-accent" />定时提醒
        </h2>
        <div class="flex flex-col gap-3">
          <label class="flex items-center justify-between gap-2">
            <span class="text-sm">启用每日代肝提醒</span>
            <Switch
              :model-value="!!reminder?.enabled"
              @update:model-value="(v: boolean) => saveReminder.mutate({ enabled: v })"
            />
          </label>
          <div class="flex items-end gap-2">
            <div class="w-32">
              <Label>推送时间</Label>
              <Input v-model="time" type="time" />
            </div>
            <Button
              variant="subtle"
              :disabled="!reminder?.enabled || saveReminder.isPending.value"
              @click="saveReminder.mutate({ push_time: time })"
            >
              保存时间
            </Button>
          </div>
          <p class="text-xs text-dim">
            {{
              reminder?.enabled
                ? `已启用 · 每天 ${reminder.push_time} 推送`
                : '启用后每天按时推送今日代肝状态（需已绑定 QQ 且有待办记录）'
            }}
          </p>
        </div>
      </Panel>

      <Panel v-if="profile.passkey_enabled" class="p-4">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="flex items-center gap-2 font-semibold">
            <KeyRound class="h-5 w-5 text-accent" />通行密钥
          </h2>
          <Button size="sm" variant="subtle" :disabled="addPasskey.isPending.value" @click="addPasskey.mutate()">
            添加
          </Button>
        </div>
        <div class="flex flex-col gap-2">
          <p v-if="!passkeys?.length" class="text-sm text-muted">尚未添加通行密钥</p>
          <div
            v-for="p in passkeys"
            :key="p.id"
            class="flex items-center justify-between gap-2"
          >
            <span class="truncate text-sm">
              通行密钥 · {{ p.credential_id }}<template v-if="p.created_at"> · {{ formatDate(p.created_at) }}</template>
            </span>
            <Button variant="outline" size="sm" @click="deletePasskey(p.id)">删除</Button>
          </div>
        </div>
      </Panel>

      <Panel class="p-4">
        <h2 class="mb-3 font-semibold">{{ profile.password_set ? '修改密码' : '设置密码' }}</h2>
        <div class="flex flex-col gap-3">
          <div v-if="profile.password_set">
            <Label>原密码</Label>
            <Input v-model="oldPw" type="password" />
          </div>
          <div>
            <Label>新密码（至少 6 位）</Label>
            <Input v-model="newPw" type="password" />
          </div>
          <div>
            <Label>确认新密码</Label>
            <Input v-model="confirmPw" type="password" />
          </div>
          <Button
            variant="primary"
            class="self-start"
            :disabled="changePw.isPending.value"
            @click="submitPassword"
          >
            保存
          </Button>
        </div>
      </Panel>
    </template>
  </div>
</template>