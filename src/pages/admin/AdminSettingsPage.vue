<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { Mail, RefreshCw, Save } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Api } from '@/lib/api'
import { qk } from '@/lib/query'
import type { FontList, SystemSettings } from '@/lib/types'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import Panel from '@/components/ui/Panel.vue'
import Select from '@/components/ui/Select.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import Switch from '@/components/ui/Switch.vue'

const qc = useQueryClient()
const { data, isLoading } = useQuery<SystemSettings>({
  queryKey: qk.admin.settings,
  queryFn: () => Api<SystemSettings>('/api/admin/settings'),
  refetchOnMount: 'always',
})

const form = ref<SystemSettings | null>(null)
const rpIds = ref('')
const testTo = ref('')

watch(data, (d) => {
  if (d) {
    form.value = { ...d }
    rpIds.value = (d.passkey_rp_ids ?? []).join(', ')
  }
}, { immediate: true })

const { data: fonts, refetch: refetchFonts } = useQuery<FontList>({
  queryKey: qk.admin.fonts,
  queryFn: () => Api<FontList>('/api/admin/fonts'),
})

function set<K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) {
  if (form.value) form.value = { ...form.value, [key]: value }
}

const save = useMutation({
  mutationFn: () =>
    Api<SystemSettings>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({
        ...form.value,
        passkey_rp_ids: rpIds.value.split(',').map((s) => s.trim()).filter(Boolean),
      }),
    }),
  onSuccess: (d) => {
    toast.success('设置已保存')
    form.value = { ...d }
    rpIds.value = (d.passkey_rp_ids ?? []).join(', ')
    qc.setQueryData(qk.admin.settings, d)
    // 保存后重新拉取服务端设置并回填表单，确保数值与持久化结果一致
    qc.invalidateQueries({ queryKey: qk.admin.settings })
    // 设置项可能影响登录页配置与个人设置页，主动失效以便立即刷新
    qc.invalidateQueries({ queryKey: qk.authConfig })
    qc.invalidateQueries({ queryKey: qk.profile })
  },
  onError: (e: unknown) => toast.error(e instanceof Error ? e.message : '保存失败'),
})

const testEmail = useMutation({
  mutationFn: () => Api('/api/admin/email/test', { method: 'POST', body: JSON.stringify({ to: testTo.value.trim() }) }),
  onSuccess: () => toast.success('测试邮件已发送'),
  onError: (e: unknown) => toast.error(e instanceof Error ? e.message : '发送失败'),
})

const smtpSecurityOptions = [
  { value: 'none', label: '无' },
  { value: 'tls', label: 'TLS' },
  { value: 'starttls', label: 'STARTTLS' },
]
const templateOptions = [
  { value: 'shadcn', label: 'shadcn' },
  { value: 'material', label: 'material' },
  { value: 'apple', label: 'apple' },
  { value: 'shell', label: 'shell' },
]
const fontCount = computed(() => fonts.value?.fonts?.length ?? 0)
</script>

<template>
  <div class="mx-auto flex max-w-3xl flex-col gap-3">
    <Skeleton v-if="isLoading || !form" class="h-96 w-full" />
    <template v-else>
      <div class="flex justify-end">
        <Button variant="primary" :disabled="save.isPending.value" @click="save.mutate()"><Save />保存设置</Button>
      </div>

      <Panel class="p-4">
        <h2 class="mb-3 font-semibold">通用</h2>
        <div class="flex flex-col divide-y divide-border">
          <label class="flex items-center justify-between gap-3 py-2">
            <span class="text-sm">反向代理模式 <span class="text-xs text-dim">（信任 X-Forwarded-* 头）</span></span>
            <Switch :model-value="form.reverse_proxy" @update:model-value="(v: boolean) => set('reverse_proxy', v)" />
          </label>
          <label class="flex items-center justify-between gap-3 py-2">
            <span class="text-sm">允许上传头像</span>
            <Switch :model-value="form.allow_avatar_upload" @update:model-value="(v: boolean) => set('allow_avatar_upload', v)" />
          </label>
          <label class="flex items-center justify-between gap-3 py-2">
            <span class="text-sm">开放邮箱绑定</span>
            <Switch :model-value="form.allow_email_binding" @update:model-value="(v: boolean) => set('allow_email_binding', v)" />
          </label>
          <label class="flex items-center justify-between gap-3 py-2">
            <span class="text-sm">开放忘记密码</span>
            <Switch :model-value="form.allow_forgot_password" @update:model-value="(v: boolean) => set('allow_forgot_password', v)" />
          </label>
        </div>
      </Panel>

      <Panel class="p-4">
        <h2 class="mb-3 font-semibold">通行密钥（Passkey）</h2>
        <div class="flex flex-col gap-3">
          <label class="flex items-center justify-between gap-3">
            <span class="text-sm">启用通行密钥</span>
            <Switch :model-value="form.passkey_enabled" @update:model-value="(v: boolean) => set('passkey_enabled', v)" />
          </label>
          <label class="flex items-center justify-between gap-3">
            <span class="text-sm">允许 HTTP 测试 <span class="text-xs text-dim">（生产请用 HTTPS）</span></span>
            <Switch :model-value="form.passkey_allow_http" @update:model-value="(v: boolean) => set('passkey_allow_http', v)" />
          </label>
          <div>
            <Label>允许的域名（RP ID，逗号分隔）</Label>
            <Input v-model="rpIds" placeholder="example.com, localhost" />
          </div>
        </div>
      </Panel>

      <Panel class="p-4">
        <h2 class="mb-3 font-semibold">邮件（SMTP）</h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <div><Label>SMTP 主机</Label><Input :model-value="form.smtp_host ?? ''" @update:model-value="(v: string | number) => set('smtp_host', String(v))" /></div>
          <div>
            <Label>端口</Label>
            <Input
              inputmode="numeric"
              :model-value="form.smtp_port ?? ''"
              @update:model-value="(v: string | number) => set('smtp_port', String(v) ? Number(v) : null)"
            />
          </div>
          <div><Label>用户名</Label><Input :model-value="form.smtp_user ?? ''" @update:model-value="(v: string | number) => set('smtp_user', String(v))" /></div>
          <div><Label>密码</Label><Input type="password" :model-value="form.smtp_password ?? ''" @update:model-value="(v: string | number) => set('smtp_password', String(v))" /></div>
          <div><Label>发件人</Label><Input :model-value="form.smtp_from ?? ''" @update:model-value="(v: string | number) => set('smtp_from', String(v))" /></div>
          <div>
            <Label>加密方式</Label>
            <Select :model-value="form.smtp_security ?? 'none'" :options="smtpSecurityOptions" @update:model-value="(v: string) => set('smtp_security', v)" />
          </div>
        </div>
        <div class="mt-3 flex items-end gap-2">
          <div class="flex-1"><Label>测试收件人</Label><Input v-model="testTo" placeholder="you@example.com" /></div>
          <Button variant="subtle" :disabled="testEmail.isPending.value || !testTo.includes('@')" @click="testEmail.mutate()">
            <Mail />发送测试
          </Button>
        </div>
      </Panel>

      <Panel class="p-4">
        <h2 class="mb-3 font-semibold">消息文转图</h2>
        <div class="flex flex-col divide-y divide-border">
          <label class="flex items-center justify-between gap-3 py-2">
            <span class="text-sm">启用 /代肝帮助</span>
            <Switch :model-value="form.render_enabled_help" @update:model-value="(v: boolean) => set('render_enabled_help', v)" />
          </label>
          <label class="flex items-center justify-between gap-3 py-2">
            <span class="text-sm">启用 /代肝列表</span>
            <Switch :model-value="form.render_enabled_list" @update:model-value="(v: boolean) => set('render_enabled_list', v)" />
          </label>
          <label class="flex items-center justify-between gap-3 py-2">
            <span class="text-sm">启用 /进度查询</span>
            <Switch :model-value="form.render_enabled_progress" @update:model-value="(v: boolean) => set('render_enabled_progress', v)" />
          </label>
          <label class="flex items-center justify-between gap-3 py-2">
            <span class="text-sm">启用提醒推送</span>
            <Switch :model-value="form.render_enabled_reminder" @update:model-value="(v: boolean) => set('render_enabled_reminder', v)" />
          </label>
        </div>
        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>模板</Label>
            <Select :model-value="form.render_template ?? 'shadcn'" :options="templateOptions" @update:model-value="(v: string) => set('render_template', v)" />
          </div>
          <div><Label>字体目录</Label><Input :model-value="form.render_font_dir ?? ''" @update:model-value="(v: string | number) => set('render_font_dir', String(v))" /></div>
          <div class="sm:col-span-2">
            <Label>字体文件</Label>
            <Input :model-value="form.render_font ?? ''" placeholder="留空使用默认" @update:model-value="(v: string | number) => set('render_font', String(v))" />
          </div>
        </div>
        <div class="mt-3 flex items-center gap-2">
          <Button variant="outline" size="sm" @click="refetchFonts()"><RefreshCw />刷新字体列表</Button>
          <span class="text-xs text-dim">目录 {{ fonts?.dir ?? '-' }}，共 {{ fontCount }} 个字体</span>
        </div>
      </Panel>
    </template>
  </div>
</template>