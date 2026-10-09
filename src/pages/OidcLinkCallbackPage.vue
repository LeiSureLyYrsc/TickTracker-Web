<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

const route = useRoute()
const router = useRouter()

onMounted(() => {
  if (route.query.ok) toast.success('已绑定第三方账号')
  else toast.error(String(route.query.error || '绑定失败'))
  setTimeout(() => router.back(), 1200)
})
</script>

<template>
  <div class="flex min-h-full items-center justify-center bg-bg text-sm text-muted">正在返回…</div>
</template>