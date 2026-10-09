export type Role = 'admin' | 'user'

export interface OidcProviderPublic {
  id: string
  name: string
  icon: string
  icon_url?: string | null
}

export interface AuthConfig {
  allow_forgot_password: boolean
  passkey_enabled: boolean
  oidc_providers: OidcProviderPublic[]
}

export interface LoginResult {
  token: string
  role: Role
  user_id: number | null
  user_name: string
}

export interface Commission {
  id: number
  user_id: number
  user_name: string
  game_id: number
  game_name: string
  group_id: number | null
  group_name: string | null
  completed_count: number
  checked_in: boolean
  last_checked_in_at: string | null
}

export interface MyCommission {
  id: number
  game_id: number
  game_name: string
  group_id: number | null
  group_name: string | null
  completed_count: number
  checked_in: boolean
  last_checked_in_at: string | null
}

export interface GroupDue {
  game_group_id: number
  group_name: string
  total_count: number
}

export interface ProgressItem {
  game_name: string
  group_id: number | null
  group_name: string | null
  checked_in: boolean
  last_checked_in_at: string | null
}

export interface GroupCommission {
  id: number
  user_id: number
  user_name: string
  game_group_id: number
  group_name: string
  total_count: number
}

export interface Game {
  id: number
  name: string
  created_at?: string
  aliases?: string[]
  group_id: number | null
  group_name: string | null
}

export interface GameGroupGame {
  id: number
  name: string
  created_at: string
  aliases: string[]
}

export interface GameGroup {
  id: number
  name: string
  created_at?: string
  games?: GameGroupGame[]
}

export interface AdminUser {
  id: number
  name: string
  role: string
  is_admin: boolean
  qq_id: number | null
  email: string | null
  email_verified: boolean
  login_disabled: boolean
  created_at: string
  aliases: string[]
}

export interface Message {
  id: number
  user_id: number
  user_name: string
  game_id: number
  game_name: string
  content: string
  created_at: string
  is_read: boolean
}

export interface MyMessage {
  id: number
  game_name: string
  content: string
  created_at: string
  is_read: boolean
}

export interface AuditLog {
  id: number
  created_at: string | null
  actor_type: string
  actor_name: string
  action: string
  target: string | null
  detail: string | null
  ip: string | null
}

export interface SystemSettings {
  reverse_proxy: boolean
  allow_avatar_upload: boolean
  smtp_host: string | null
  smtp_port: number | null
  smtp_user: string | null
  smtp_password: string | null
  smtp_from: string | null
  smtp_security: string | null
  allow_email_binding: boolean
  allow_forgot_password: boolean
  passkey_enabled: boolean
  passkey_rp_ids: string[]
  passkey_allow_http: boolean
  render_enabled_help: boolean
  render_enabled_list: boolean
  render_enabled_progress: boolean
  render_enabled_reminder: boolean
  render_template: string | null
  render_font: string | null
  render_font_dir: string | null
}

export interface FontItem {
  name: string
  family: string
}

export interface FontList {
  dir: string
  fonts: FontItem[]
}

export interface ReminderSetting {
  user_id: number
  user_name: string
  qq_id: number | null
  enabled: boolean
  push_time: string
  last_sent_date: string | null
}

export interface MyReminder {
  enabled: boolean
  push_time: string
  last_sent_date: string | null
}

export interface Profile {
  role: Role
  name: string
  user_id: number | null
  qq_id: number | null
  email: string | null
  email_verified: boolean
  has_avatar: boolean
  avatar_url: string | null
  password_set: boolean
  avatar_upload_allowed: boolean
  allow_email_binding: boolean
  passkey_enabled: boolean
  oidc_enabled: boolean
}

export interface PasskeyItem {
  id: number
  credential_id: string
  created_at: string | null
}

export interface SsoBinding {
  provider_id: string
  provider_name: string
  icon: string
  icon_url?: string | null
  email?: string | null
  name?: string | null
  created_at?: string | null
}

export interface UserGame {
  id: number
  name: string
  group_id: number | null
  group_name: string | null
}