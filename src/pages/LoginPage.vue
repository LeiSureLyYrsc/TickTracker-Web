<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { KeyRound, ShieldCheck, Sparkles } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Api } from '@/lib/api'
import { autofillSupported, loginWithPasskey, webauthnSupported } from '@/lib/webauthn'
import { qk } from '@/lib/query'
import type { AuthConfig, LoginResult } from '@/lib/types'
import { useAuthStore } from '@/stores/auth'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import Spinner from '@/components/ui/Spinner.vue'
import ForgotPasswordModal from '@/components/auth/ForgotPasswordModal.vue'

const router = useRouter()
const auth = useAuthStore()

const { data: cfg } = useQuery<AuthConfig | null>({
  queryKey: qk.authConfig,
  queryFn: () => fetch('/api/auth/config').then((r) => (r.ok ? r.json() : null)),
  staleTime: 5 * 60_000,
})

const tab = ref<'account' | 'code'>('account')
const account = ref('')
const password = ref('')
const code = ref('')
const busy = ref(false)
const forgotOpen = ref(false)

const providers = computed(() => cfg.value?.oidc_providers ?? [])

function go(data: LoginResult) {
  if (data.role === 'admin') {
    auth.setAuth(data.token, 'admin', data.user_name ?? 'admin', data.user_id)
    router.replace('/admin/commissions')
  } else {
    auth.setAuth(data.token, 'user', data.user_name, data.user_id)
    router.replace('/user/commissions')
  }
}

async function accountLogin() {
  if (!account.value.trim() || !password.value) return toast.error('请输入账号和密码')
  busy.value = true
  try {
    const data = await Api<LoginResult>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ account: account.value.trim(), password: password.value }),
    })
    toast.success('登录成功')
    go(data)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '登录失败')
  } finally {
    busy.value = false
  }
}

async function codeLogin() {
  if (code.value.length !== 6) return toast.error('请输入 6 位验证码')
  busy.value = true
  try {
    const data = await Api<LoginResult>('/api/auth/user/login', {
      method: 'POST',
      body: JSON.stringify({ code: code.value }),
    })
    toast.success('登录成功')
    go(data)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '登录失败')
  } finally {
    busy.value = false
  }
}

async function passkeyLogin() {
  busy.value = true
  try {
    const data = await loginWithPasskey('')
    toast.success('登录成功')
    go(data)
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (!/abort|cancel|NotAllowed/i.test(msg)) toast.error(msg || '通行密钥登录失败')
  } finally {
    busy.value = false
  }
}

function oidcLogin(id: string) {
  window.location.href = `/api/oidc/login/${encodeURIComponent(id)}`
}

let cancelled = false
watch(
  () => [auth.role, cfg.value?.passkey_enabled ?? false] as const,
  async ([role, enabled]) => {
    if (role || !enabled) return
    if (!webauthnSupported() || !(await autofillSupported())) return
    try {
      const data = await loginWithPasskey('', { conditional: true })
      if (cancelled) return
      toast.success('登录成功')
      go(data)
    } catch {
      /* 用户未选择或浏览器不支持：忽略 */
    }
  },
  { immediate: true },
)
onUnmounted(() => {
  cancelled = true
})
</script>

<template>
  <div class="flex min-h-full items-center justify-center bg-bg p-4">
    <div
      class="anim-fade-up w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-[0_0_40px_-12px_rgba(34,211,238,0.25)]"
    >
      <div class="mb-5 flex flex-col items-center text-center">
        <div
          class="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-2 to-accent text-accent-fg shadow-[0_0_24px_-4px_var(--accent)]"
        >
          <Sparkles class="h-7 w-7" />
        </div>
        <h1 class="text-xl font-bold tracking-tight">代肝记录系统</h1>
        <p class="mt-1 text-sm text-muted">欢迎回来，请登录</p>
      </div>

      <div class="mb-4 grid grid-cols-2 gap-1 rounded-full border border-border bg-bg p-1">
        <button
          type="button"
          class="rounded-full py-2 text-sm font-medium transition-colors"
          :class="tab === 'account' ? 'bg-surface-2 text-text' : 'text-dim hover:text-text'"
          @click="tab = 'account'"
        >
          账号登录
        </button>
        <button
          type="button"
          class="rounded-full py-2 text-sm font-medium transition-colors"
          :class="tab === 'code' ? 'bg-surface-2 text-text' : 'text-dim hover:text-text'"
          @click="tab = 'code'"
        >
          验证码登录
        </button>
      </div>

      <div v-if="tab === 'account'" class="flex flex-col gap-3">
        <div class="flex flex-col gap-1.5">
          <Label>用户名 / 邮箱</Label>
          <Input v-model="account" autocomplete="username webauthn" @keydown.enter="accountLogin" />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label>密码</Label>
          <Input
            v-model="password"
            type="password"
            autocomplete="current-password"
            @keydown.enter="accountLogin"
          />
        </div>
        <Button variant="primary" size="lg" :disabled="busy" @click="accountLogin">
          <Spinner v-if="busy" />
          <template v-else>登 录</template>
        </Button>
        <Button v-if="cfg?.passkey_enabled" variant="subtle" :disabled="busy" @click="passkeyLogin">
          <KeyRound />
          使用通行密钥登录
        </Button>
        <button
          v-if="cfg?.allow_forgot_password"
          type="button"
          class="mx-auto text-xs text-accent hover:underline"
          @click="forgotOpen = true"
        >
          忘记密码？
        </button>
      </div>

      <div v-else class="flex flex-col gap-3">
        <div class="flex flex-col gap-1.5">
          <Label>6 位验证码</Label>
          <Input
            v-model="code"
            inputmode="numeric"
            maxlength="6"
            @input="code = code.replace(/\D/g, '')"
            @keydown.enter="codeLogin"
          />
        </div>
        <Button variant="primary" size="lg" :disabled="busy" @click="codeLogin">
          <Spinner v-if="busy" />
          <template v-else>登 录</template>
        </Button>
        <p class="text-center text-xs text-dim">
          向 Bot 发送 <code class="rounded bg-surface-2 px-1">/代肝登录</code> 获取验证码（5 分钟有效）
        </p>
      </div>

      <div v-if="providers.length" class="mt-5">
        <div class="mb-2 flex items-center gap-3 text-xs text-dim">
          <span class="h-px flex-1 bg-border" />第三方登录<span class="h-px flex-1 bg-border" />
        </div>
        <div class="flex flex-wrap justify-center gap-2">
          <Button
            v-for="p in providers"
            :key="p.id"
            variant="outline"
            size="sm"
            @click="oidcLogin(p.id)"
          >
            <ShieldCheck />
            {{ p.name }}
          </Button>
        </div>
      </div>
    </div>

    <ForgotPasswordModal v-model:open="forgotOpen" />
  </div>
</template>