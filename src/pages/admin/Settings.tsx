import { useCallback, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import TuneIcon from '@mui/icons-material/Tune'
import EmailIcon from '@mui/icons-material/Email'
import KeyIcon from '@mui/icons-material/Key'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import TravelExploreIcon from '@mui/icons-material/TravelExplore'
import RefreshIcon from '@mui/icons-material/Refresh'
import ImageIcon from '@mui/icons-material/Image'
import { apiFetch, readError } from '../../lib/api'
import { useToast } from '../../lib/toast'
import OidcIcon from '../../lib/oidcIcons'
import type { FontItem, OidcProvider, SystemSettings } from '../../types'

const ICON_OPTIONS = ['google', 'github', 'microsoft', 'discord', 'gitlab', 'qq', 'generic']

const DEFAULT_SETTINGS: SystemSettings = {
  reverse_proxy: false,
  allow_avatar_upload: false,
  smtp_host: null,
  smtp_port: 587,
  smtp_user: null,
  smtp_password: null,
  smtp_from: null,
  smtp_security: 'starttls',
  allow_email_binding: false,
  allow_forgot_password: false,
  passkey_enabled: false,
  passkey_rp_ids: [],
  passkey_allow_http: false,
  render_enabled_help: false,
  render_enabled_list: false,
  render_enabled_progress: false,
  render_enabled_reminder: false,
  render_template: 'shadcn',
  render_font: '',
  render_font_dir: './data/fonts',
}

function emptyProvider(): OidcProvider {
  return {
    name: '',
    enabled: true,
    icon: 'generic',
    icon_url: '',
    client_id: '',
    client_secret: '',
    issuer: '',
    authorization_endpoint: '',
    token_endpoint: '',
    userinfo_endpoint: '',
    jwks_uri: '',
    scopes: 'openid email profile',
    allow_register: true,
  }
}

export default function Settings() {
  const toast = useToast()
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [providers, setProviders] = useState<OidcProvider[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [editProvider, setEditProvider] = useState<OidcProvider>(emptyProvider())
  const [discovering, setDiscovering] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testing, setTesting] = useState(false)
  const [fonts, setFonts] = useState<FontItem[]>([])

  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/admin/settings')
      if (!res.ok) throw new Error()
      setSettings((await res.json()) as SystemSettings)
    } catch {
      toast('加载设置失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  const loadProviders = useCallback(async () => {
    try {
      const res = await apiFetch('/api/oidc/providers/manage')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setProviders((data.providers ?? []) as OidcProvider[])
    } catch {
      toast('加载 OIDC 提供商失败', 'error')
    }
  }, [toast])

  const loadFonts = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/fonts')
      if (res.ok) {
        const data = await res.json()
        setFonts((data.fonts ?? []) as FontItem[])
      }
    } catch {
      /* 忽略 */
    }
  }, [])

  useEffect(() => {
    loadSettings()
    loadProviders()
    loadFonts()
  }, [loadSettings, loadProviders, loadFonts])

  async function refreshFonts() {
    try {
      await apiFetch('/api/admin/fonts/reload', { method: 'POST' })
      await loadFonts()
      toast('字体列表已刷新', 'success')
    } catch {
      toast('刷新字体列表失败', 'error')
    }
  }

  async function saveSettings(patch: Partial<SystemSettings>) {
    setSaving(true)
    try {
      const res = await apiFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(patch),
      })
      if (res.ok) {
        setSettings((await res.json()) as SystemSettings)
        toast('设置已保存', 'success')
      } else {
        toast(await readError(res), 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  function openCreate() {
    setEditProvider(emptyProvider())
    setEditOpen(true)
  }

  function openEdit(p: OidcProvider) {
    setEditProvider({ ...p })
    setEditOpen(true)
  }

  async function saveProvider() {
    const p = editProvider
    if (!p.name.trim()) return toast('请输入提供商名称', 'error')
    const isNew = !p.id
    const res = await apiFetch(`/api/oidc/providers/manage${isNew ? '' : '/' + p.id}`, {
      method: isNew ? 'POST' : 'PUT',
      body: JSON.stringify({ provider: p }),
    })
    if (res.ok) {
      toast('提供商已保存', 'success')
      setEditOpen(false)
      loadProviders()
    } else {
      toast(await readError(res), 'error')
    }
  }

  async function deleteProvider(p: OidcProvider) {
    const res = await apiFetch(`/api/oidc/providers/manage/${p.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast('提供商已删除', 'success')
      loadProviders()
    } else {
      toast(await readError(res), 'error')
    }
  }

  async function sendTestEmail() {
    const to = testEmail.trim()
    if (!to.includes('@')) return toast('请输入有效的收件邮箱', 'error')
    setTesting(true)
    try {
      const res = await apiFetch('/api/admin/email/test', {
        method: 'POST',
        body: JSON.stringify({ to }),
      })
      if (res.ok) {
        toast('测试邮件已发送，请查收', 'success')
        setTestEmail('')
      } else {
        toast(await readError(res), 'error')
      }
    } finally {
      setTesting(false)
    }
  }

  async function discover() {
    const issuer = editProvider.issuer.trim()
    if (!issuer) return toast('请先填写 Issuer', 'error')
    setDiscovering(true)
    try {
      const res = await apiFetch('/api/oidc/discover', {
        method: 'POST',
        body: JSON.stringify({ issuer }),
      })
      if (res.ok) {
        const d = await res.json()
        setEditProvider((p) => ({
          ...p,
          issuer: d.issuer || p.issuer,
          authorization_endpoint: d.authorization_endpoint || p.authorization_endpoint,
          token_endpoint: d.token_endpoint || p.token_endpoint,
          userinfo_endpoint: d.userinfo_endpoint || p.userinfo_endpoint,
          jwks_uri: d.jwks_uri || p.jwks_uri,
        }))
        toast('发现成功，已自动填入端点', 'success')
      } else {
        toast(await readError(res), 'error')
      }
    } finally {
      setDiscovering(false)
    }
  }

  return (
    <Box sx={{ maxWidth: 760 }}>
      <Card sx={{ mb: 2 }}>
        <CardHeader
          title={
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <TuneIcon color="primary" />
              <span>安全策略</span>
            </Stack>
          }
          titleTypographyProps={{ variant: 'h6' }}
        />
        <CardContent>
          <Stack spacing={3}>
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.reverse_proxy}
                    onChange={(e) => setSettings({ ...settings, reverse_proxy: e.target.checked })}
                  />
                }
                label="反向代理模式"
              />
              <Typography variant="body2" color="text.secondary">
                开启后通过 X-Forwarded-For / X-Real-IP 获取客户端真实 IP。仅当 WebUI 部署在反向代理之后时开启。
              </Typography>
            </Box>
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.allow_avatar_upload}
                    onChange={(e) =>
                      setSettings({ ...settings, allow_avatar_upload: e.target.checked })
                    }
                  />
                }
                label="允许用户上传头像"
              />
              <Typography variant="body2" color="text.secondary">
                开启后用户可在个人设置上传头像。
              </Typography>
            </Box>
            <Button
              variant="contained"
              disabled={saving}
              onClick={() =>
                saveSettings({ reverse_proxy: settings.reverse_proxy, allow_avatar_upload: settings.allow_avatar_upload })
              }
              sx={{ alignSelf: 'flex-start' }}
            >
              保存
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardHeader
          title={
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <EmailIcon color="primary" />
              <span>邮箱设置</span>
            </Stack>
          }
          titleTypographyProps={{ variant: 'h6' }}
        />
        <CardContent>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="SMTP 服务器"
                value={settings.smtp_host ?? ''}
                onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                sx={{ flex: 1 }}
              />
              <TextField
                label="端口"
                value={settings.smtp_port}
                onChange={(e) => setSettings({ ...settings, smtp_port: Number(e.target.value) || 587 })}
                slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
                sx={{ width: 110 }}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="用户名"
                value={settings.smtp_user ?? ''}
                onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                sx={{ flex: 1 }}
              />
              <TextField
                label="密码"
                type="password"
                value={settings.smtp_password ?? ''}
                onChange={(e) => setSettings({ ...settings, smtp_password: e.target.value })}
                sx={{ flex: 1 }}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="发件人地址"
                value={settings.smtp_from ?? ''}
                onChange={(e) => setSettings({ ...settings, smtp_from: e.target.value })}
                sx={{ flex: 1 }}
              />
              <Box sx={{ minWidth: 160 }}>
                <InputLabel>加密方式</InputLabel>
                <Select
                  size="small"
                  fullWidth
                  value={settings.smtp_security}
                  onChange={(e) => setSettings({ ...settings, smtp_security: e.target.value })}
                >
                  <MenuItem value="none">无</MenuItem>
                  <MenuItem value="starttls">STARTTLS（587）</MenuItem>
                  <MenuItem value="tls">隐式 TLS（465）</MenuItem>
                </Select>
              </Box>
            </Stack>
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.allow_email_binding}
                    onChange={(e) => setSettings({ ...settings, allow_email_binding: e.target.checked })}
                  />
                }
                label="允许绑定邮箱"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.allow_forgot_password}
                    onChange={(e) => setSettings({ ...settings, allow_forgot_password: e.target.checked })}
                  />
                }
                label="允许忘记密码"
              />
              <Typography variant="body2" color="text.secondary">
                关闭时不显示对应功能；配置 SMTP 后可发送绑定/重置验证码。
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <TextField
                label="测试收件邮箱"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                sx={{ flex: 1, maxWidth: 280 }}
                onKeyDown={(e) => e.key === 'Enter' && sendTestEmail()}
              />
              <Button variant="tonal" disabled={testing} onClick={sendTestEmail}>
                发送测试邮件
              </Button>
            </Stack>
            <Button
              variant="contained"
              disabled={saving}
              onClick={() =>
                saveSettings({
                  smtp_host: settings.smtp_host,
                  smtp_port: settings.smtp_port,
                  smtp_user: settings.smtp_user,
                  smtp_password: settings.smtp_password,
                  smtp_from: settings.smtp_from,
                  smtp_security: settings.smtp_security,
                  allow_email_binding: settings.allow_email_binding,
                  allow_forgot_password: settings.allow_forgot_password,
                })
              }
              sx={{ alignSelf: 'flex-start' }}
            >
              保存
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardHeader
          title={
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <KeyIcon color="primary" />
              <span>Passkey 通行密钥</span>
            </Stack>
          }
          titleTypographyProps={{ variant: 'h6' }}
        />
        <CardContent>
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.passkey_enabled}
                  onChange={(e) => setSettings({ ...settings, passkey_enabled: e.target.checked })}
                />
              }
              label="启用 Passkey 登录"
            />
            <TextField
              label="允许的域名（多个用逗号分隔）"
              value={settings.passkey_rp_ids.join(', ')}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  passkey_rp_ids: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })
              }
              helperText="例如：example.com, localhost。留空表示不限制域名。"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.passkey_allow_http}
                  onChange={(e) => setSettings({ ...settings, passkey_allow_http: e.target.checked })}
                />
              }
              label="允许 HTTP 访问（仅测试用）"
            />
            <Typography variant="body2" color="text.secondary">
              Passkey 需要 HTTPS 访问；登录页与个人设置仅在启用后显示相关功能。
            </Typography>
            <Button
              variant="contained"
              disabled={saving}
              onClick={() =>
                saveSettings({
                  passkey_enabled: settings.passkey_enabled,
                  passkey_rp_ids: settings.passkey_rp_ids,
                  passkey_allow_http: settings.passkey_allow_http,
                })
              }
              sx={{ alignSelf: 'flex-start' }}
            >
              保存
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardHeader
          title={
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <ImageIcon color="primary" />
              <span>消息渲染（文转图）</span>
            </Stack>
          }
          titleTypographyProps={{ variant: 'h6' }}
        />
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              开启后对应消息将以图片形式发送。需要安装 Playwright 并执行{' '}
              <code>playwright install chromium</code>；未安装时自动回退为纯文本。
            </Typography>
            <Stack direction="row" spacing={3} useFlexGap sx={{ flexWrap: 'wrap' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.render_enabled_help}
                    onChange={(e) => setSettings({ ...settings, render_enabled_help: e.target.checked })}
                  />
                }
                label="代肝帮助"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.render_enabled_list}
                    onChange={(e) => setSettings({ ...settings, render_enabled_list: e.target.checked })}
                  />
                }
                label="代肝列表"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.render_enabled_progress}
                    onChange={(e) => setSettings({ ...settings, render_enabled_progress: e.target.checked })}
                  />
                }
                label="进度查询"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.render_enabled_reminder}
                    onChange={(e) => setSettings({ ...settings, render_enabled_reminder: e.target.checked })}
                  />
                }
                label="提醒推送通知"
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Box sx={{ minWidth: 180 }}>
                <InputLabel>页面模板</InputLabel>
                <Select
                  size="small"
                  fullWidth
                  value={settings.render_template}
                  onChange={(e) => setSettings({ ...settings, render_template: e.target.value })}
                >
                  <MenuItem value="shadcn">shadcn-ui 风格</MenuItem>
                  <MenuItem value="apple">苹果风格</MenuItem>
                  <MenuItem value="material">原生安卓风格</MenuItem>
                  <MenuItem value="shell">Command Shell 风格</MenuItem>
                </Select>
              </Box>
              <Box sx={{ minWidth: 220 }}>
                <InputLabel>字体</InputLabel>
                <Select
                  size="small"
                  fullWidth
                  value={settings.render_font}
                  onChange={(e) => setSettings({ ...settings, render_font: e.target.value })}
                >
                  <MenuItem value="">系统字体（默认）</MenuItem>
                  {fonts.map((f) => (
                    <MenuItem key={f.name} value={f.name}>
                      {f.family}（{f.name}）
                    </MenuItem>
                  ))}
                </Select>
              </Box>
              <TextField
                label="字体目录"
                value={settings.render_font_dir}
                disabled
                sx={{ flex: 1 }}
                helperText="默认 ./data/fonts（固定，不可修改），字体仅由本地渲染使用，不会对外提供"
              />
              <Button variant="tonal" startIcon={<RefreshIcon />} onClick={refreshFonts}>
                刷新字体
              </Button>
            </Stack>
            <Button
              variant="contained"
              disabled={saving}
              onClick={() =>
                saveSettings({
                  render_enabled_help: settings.render_enabled_help,
                  render_enabled_list: settings.render_enabled_list,
                  render_enabled_progress: settings.render_enabled_progress,
                  render_enabled_reminder: settings.render_enabled_reminder,
                  render_template: settings.render_template,
                  render_font: settings.render_font,
                })
              }
              sx={{ alignSelf: 'flex-start' }}
            >
              保存
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title={
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <OpenInNewIcon color="primary" />
              <span>OIDC 第三方登录</span>
            </Stack>
          }
          action={
            <Button size="small" variant="tonal" startIcon={<AddIcon />} onClick={openCreate}>
              添加提供商
            </Button>
          }
          titleTypographyProps={{ variant: 'h6' }}
        />
        <CardContent>
          {providers.length === 0 ? (
            <Typography color="text.secondary">尚未配置 OIDC 提供商</Typography>
          ) : (
            <Stack spacing={1}>
              {providers.map((p) => (
                <Stack
                  key={p.id}
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <OidcIcon icon={p.icon} iconUrl={p.icon_url} />
                    <Typography variant="body1">{p.name}</Typography>
                    <Chip label={p.enabled ? '启用' : '停用'} size="small" color={p.enabled ? 'success' : 'default'} />
                    {p.allow_register && <Chip label="开放注册" size="small" variant="outlined" />}
                  </Stack>
                  <Stack direction="row" spacing={0.5}>
                    <Button size="small" onClick={() => openEdit(p)}>
                      编辑
                    </Button>
                    <IconButton size="small" color="error" onClick={() => deleteProvider(p)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editProvider.id ? '编辑 OIDC 提供商' : '添加 OIDC 提供商'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="名称"
                value={editProvider.name}
                onChange={(e) => setEditProvider({ ...editProvider, name: e.target.value })}
                sx={{ flex: 1 }}
              />
              <Box sx={{ minWidth: 150 }}>
                <InputLabel>图标</InputLabel>
                <Select
                  size="small"
                  fullWidth
                  value={editProvider.icon}
                  onChange={(e) => setEditProvider({ ...editProvider, icon: e.target.value })}
                >
                  {ICON_OPTIONS.map((ic) => (
                    <MenuItem key={ic} value={ic}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <OidcIcon icon={ic} iconUrl={editProvider.icon_url} />
                        <span>{ic}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            </Stack>
            <TextField
              label="自定义图标地址（URL，可选）"
              value={editProvider.icon_url ?? ''}
              onChange={(e) => setEditProvider({ ...editProvider, icon_url: e.target.value })}
              helperText="填写后优先使用该图片作为登录按钮图标"
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Client ID"
                value={editProvider.client_id}
                onChange={(e) => setEditProvider({ ...editProvider, client_id: e.target.value })}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Client Secret"
                type="password"
                value={editProvider.client_secret}
                onChange={(e) => setEditProvider({ ...editProvider, client_secret: e.target.value })}
                sx={{ flex: 1 }}
              />
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <TextField
                label="Issuer（用于 .well-known 发现）"
                value={editProvider.issuer}
                onChange={(e) => setEditProvider({ ...editProvider, issuer: e.target.value })}
                sx={{ flex: 1 }}
              />
              <Button variant="tonal" disabled={discovering} onClick={discover} startIcon={<TravelExploreIcon />}>
                发现配置
              </Button>
            </Stack>
            <TextField
              label="授权端点"
              value={editProvider.authorization_endpoint}
              onChange={(e) => setEditProvider({ ...editProvider, authorization_endpoint: e.target.value })}
            />
            <TextField
              label="令牌端点"
              value={editProvider.token_endpoint}
              onChange={(e) => setEditProvider({ ...editProvider, token_endpoint: e.target.value })}
            />
            <TextField
              label="用户信息端点"
              value={editProvider.userinfo_endpoint}
              onChange={(e) => setEditProvider({ ...editProvider, userinfo_endpoint: e.target.value })}
            />
            <TextField
              label="JWKS URI"
              value={editProvider.jwks_uri}
              onChange={(e) => setEditProvider({ ...editProvider, jwks_uri: e.target.value })}
            />
            <TextField
              label="Scopes"
              value={editProvider.scopes}
              onChange={(e) => setEditProvider({ ...editProvider, scopes: e.target.value })}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={editProvider.enabled}
                  onChange={(e) => setEditProvider({ ...editProvider, enabled: e.target.checked })}
                />
              }
              label="启用"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={editProvider.allow_register}
                  onChange={(e) => setEditProvider({ ...editProvider, allow_register: e.target.checked })}
                />
              }
              label="允许注册（未绑定用户可通过此方式创建账号）"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditOpen(false)}>取消</Button>
          <Button variant="contained" onClick={saveProvider}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {loading && <LinearProgress />}
    </Box>
  )
}
