import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Role } from '@/lib/types'

const TOKEN = 'tt_token'
const ROLE = 'tt_role'
const NAME = 'tt_user_name'
const ID = 'tt_user_id'

function readRole(): Role | null {
  const r = localStorage.getItem(ROLE)
  return r === 'admin' || r === 'user' ? r : null
}

function setOrRemove(key: string, value: string | null) {
  if (value === null || value === '') localStorage.removeItem(key)
  else localStorage.setItem(key, value)
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN))
  const role = ref<Role | null>(readRole())
  const userName = ref<string | null>(localStorage.getItem(NAME))
  const rawId = localStorage.getItem(ID)
  const userId = ref<number | null>(rawId ? Number(rawId) : null)

  const isAuthed = computed(() => !!role.value)

  function setAuth(t: string, r: Role, name?: string | null, id?: number | null) {
    token.value = t
    role.value = r
    if (name !== undefined) userName.value = name
    if (id !== undefined) userId.value = id
    setOrRemove(TOKEN, t)
    setOrRemove(ROLE, r)
    setOrRemove(NAME, userName.value)
    setOrRemove(ID, userId.value === null ? null : String(userId.value))
  }

  function clear() {
    token.value = null
    role.value = null
    userName.value = null
    userId.value = null
    setOrRemove(TOKEN, null)
    setOrRemove(ROLE, null)
    setOrRemove(NAME, null)
    setOrRemove(ID, null)
  }

  return { token, role, userName, userId, isAuthed, setAuth, clear }
})