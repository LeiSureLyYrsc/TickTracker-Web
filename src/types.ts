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

export interface GameGroup {
  id: number
  name: string
  created_at?: string
  games?: Game[]
}

export interface User {
  id: number
  name: string
  role?: 'user' | 'admin'
  is_admin?: boolean
  qq_id: number | null
  email: string | null
  email_verified?: boolean
  login_disabled?: boolean
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

export interface AuditLog {
  id: number
  created_at: string
  actor_type: string
  actor_name: string
  action: string
  target: string | null
  detail: string | null
  ip: string | null
}

export interface OidcProvider {
  id?: string
  name: string
  enabled: boolean
  icon: string
  icon_url?: string
  client_id: string
  client_secret: string
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  userinfo_endpoint: string
  jwks_uri: string
  scopes: string
  allow_register: boolean
}

export interface SystemSettings {
  reverse_proxy: boolean
  allow_avatar_upload: boolean
  smtp_host: string | null
  smtp_port: number
  smtp_user: string | null
  smtp_password: string | null
  smtp_from: string | null
  smtp_security: string
  allow_email_binding: boolean
  allow_forgot_password: boolean
  passkey_enabled: boolean
  passkey_rp_ids: string[]
  passkey_allow_http: boolean
  render_enabled_help: boolean
  render_enabled_list: boolean
  render_enabled_progress: boolean
  render_enabled_reminder: boolean
  render_template: string
  render_font: string
  render_font_dir: string
}

export interface FontItem {
  name: string
  family: string
}

export interface ReminderSetting {
  user_id: number
  user_name: string
  qq_id: number | null
  enabled: boolean
  push_time: string
  last_sent_date: string | null
}
