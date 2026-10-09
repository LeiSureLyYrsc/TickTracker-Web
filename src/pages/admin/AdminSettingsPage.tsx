import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Mail, RefreshCw, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Api } from '@/lib/api'
import { qk } from '@/lib/query'
import type { FontList, SystemSettings } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm">
        {label}
        {hint && <span className="ml-1 text-xs text-muted-foreground">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

export default function AdminSettingsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: qk.admin.settings,
    queryFn: () => Api<SystemSettings>('/api/admin/settings'),
  })
  const [form, setForm] = useState<SystemSettings | null>(null)
  const [rpIds, setRpIds] = useState('')
  const [testTo, setTestTo] = useState('')

  useEffect(() => {
    if (data) {
      setForm(data)
      setRpIds((data.passkey_rp_ids ?? []).join(', '))
    }
  }, [data])

  const { data: fonts, refetch: refetchFonts } = useQuery({
    queryKey: qk.admin.fonts,
    queryFn: () => Api<FontList>('/api/admin/fonts'),
  })

  function set<K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f))
  }

  const save = useMutation({
    mutationFn: () =>
      Api<SystemSettings>('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          ...form,
          passkey_rp_ids: rpIds
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      }),
    onSuccess: (d) => {
      toast.success('设置已保存')
      setForm(d)
      setRpIds((d.passkey_rp_ids ?? []).join(', '))
      qc.setQueryData(qk.admin.settings, d)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '保存失败'),
  })

  const testEmail = useMutation({
    mutationFn: () => Api('/api/admin/email/test', { method: 'POST', body: JSON.stringify({ to: testTo.trim() }) }),
    onSuccess: () => toast.success('测试邮件已发送'),
    onError: (e) => toast.error(e instanceof Error ? e.message : '发送失败'),
  })

  if (isLoading || !form) return <Skeleton className="h-96 w-full" />

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3">
      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Spinner /> : <Save />}
          保存设置
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>通用</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          <Row label="反向代理模式" hint="信任 X-Forwarded-* 头">
            <Switch checked={form.reverse_proxy} onCheckedChange={(v) => set('reverse_proxy', v)} />
          </Row>
          <Row label="允许上传头像">
            <Switch checked={form.allow_avatar_upload} onCheckedChange={(v) => set('allow_avatar_upload', v)} />
          </Row>
          <Row label="开放邮箱绑定">
            <Switch checked={form.allow_email_binding} onCheckedChange={(v) => set('allow_email_binding', v)} />
          </Row>
          <Row label="开放忘记密码">
            <Switch checked={form.allow_forgot_password} onCheckedChange={(v) => set('allow_forgot_password', v)} />
          </Row>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>通行密钥（Passkey）</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Row label="启用通行密钥">
            <Switch checked={form.passkey_enabled} onCheckedChange={(v) => set('passkey_enabled', v)} />
          </Row>
          <Row label="允许 HTTP 测试" hint="生产环境请务必使用 HTTPS">
            <Switch checked={form.passkey_allow_http} onCheckedChange={(v) => set('passkey_allow_http', v)} />
          </Row>
          <div>
            <Label>允许的域名（RP ID，逗号分隔）</Label>
            <Input value={rpIds} onChange={(e) => setRpIds(e.target.value)} placeholder="example.com, localhost" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>邮件（SMTP）</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>SMTP 主机</Label>
              <Input value={form.smtp_host ?? ''} onChange={(e) => set('smtp_host', e.target.value)} />
            </div>
            <div>
              <Label>端口</Label>
              <Input
                inputMode="numeric"
                value={form.smtp_port ?? ''}
                onChange={(e) => set('smtp_port', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div>
              <Label>用户名</Label>
              <Input value={form.smtp_user ?? ''} onChange={(e) => set('smtp_user', e.target.value)} />
            </div>
            <div>
              <Label>密码</Label>
              <Input type="password" value={form.smtp_password ?? ''} onChange={(e) => set('smtp_password', e.target.value)} />
            </div>
            <div>
              <Label>发件人</Label>
              <Input value={form.smtp_from ?? ''} onChange={(e) => set('smtp_from', e.target.value)} />
            </div>
            <div>
              <Label>加密方式</Label>
              <Select value={form.smtp_security ?? 'none'} onValueChange={(v) => set('smtp_security', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">无</SelectItem>
                  <SelectItem value="tls">TLS</SelectItem>
                  <SelectItem value="starttls">STARTTLS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label>测试收件人</Label>
              <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" />
            </div>
            <Button variant="tonal" onClick={() => testTo.includes('@') && testEmail.mutate()} disabled={testEmail.isPending}>
              {testEmail.isPending ? <Spinner /> : <Mail />}
              发送测试
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>消息文转图</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Row label="启用 /代肝帮助">
            <Switch checked={form.render_enabled_help} onCheckedChange={(v) => set('render_enabled_help', v)} />
          </Row>
          <Row label="启用 /代肝列表">
            <Switch checked={form.render_enabled_list} onCheckedChange={(v) => set('render_enabled_list', v)} />
          </Row>
          <Row label="启用 /进度查询">
            <Switch checked={form.render_enabled_progress} onCheckedChange={(v) => set('render_enabled_progress', v)} />
          </Row>
          <Row label="启用提醒推送">
            <Switch checked={form.render_enabled_reminder} onCheckedChange={(v) => set('render_enabled_reminder', v)} />
          </Row>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>模板</Label>
              <Select value={form.render_template ?? 'shadcn'} onValueChange={(v) => set('render_template', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shadcn">shadcn</SelectItem>
                  <SelectItem value="material">material</SelectItem>
                  <SelectItem value="apple">apple</SelectItem>
                  <SelectItem value="shell">shell</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>字体目录</Label>
              <Input value={form.render_font_dir ?? ''} onChange={(e) => set('render_font_dir', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>字体文件</Label>
              <Input value={form.render_font ?? ''} onChange={(e) => set('render_font', e.target.value)} placeholder="留空使用默认" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchFonts()}>
              <RefreshCw />
              刷新字体列表
            </Button>
            <span className="text-xs text-muted-foreground">
              目录 {fonts?.dir ?? '-'}，共 {fonts?.fonts?.length ?? 0} 个字体
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}