<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Api } from '@/lib/api'
import type { LoginResult } from '@/lib/types'
import { useAuthStore } from '@/stores/auth'
import Spinner from '@/components/ui/Spinner.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const error = ref('')

onMounted(async () => {
  const code = route.query.code
  if (typeof code !== 'string' || !code) {
    error.value = '缺少会话码'
    return
  }
  try {
    const data = await Api<LoginResult>('/api/oidc/consume', {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
    if (data.role === 'admin') {
      auth.setAuth(data.token, 'admin', data.user_name ?? 'admin', data.user_id)
      router.replace('/admin/commissions')
    } else {
      auth.setAuth(data.token, 'user', data.user_name, data.user_id)
      router.replace('/user/commissions')
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '登录失败'
  }
})
</script>

<template>
  <div class="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg">
    <p v-if="error" class="text-sm text-danger">{{ error }}</p>
    <template v-else>
      <Spinner class="!h-6 !w-6 text-accent" />
      <p class="text-sm text-muted">正在登录…</p>
    </template>
  </div>
</template>