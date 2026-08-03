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
  qq_id: number | null
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
