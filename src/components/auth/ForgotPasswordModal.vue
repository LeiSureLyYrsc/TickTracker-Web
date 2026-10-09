<script setup lang="ts">
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { Api } from '@/lib/api'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import Modal from '@/components/ui/Modal.vue'
import Spinner from '@/components/ui/Spinner.vue'

const open = defineModel<boolean>('open', { default: false })
const step = ref<'send' | 'reset'>('send')
const account = ref('')
const code = ref('')
const newPassword = ref('')
const busy = ref(false)

async function send() {
  if (!account.value.trim()) return toast.error('请输入账号')
  busy.value = true
  try {
    await Api('/api/auth/forgot/send', {
      method: 'POST',
      body: JSON.stringify({ account: account.value.trim() }),
    })
    toast.success('若该账号绑定了已验证邮箱，重置验证码已发送')
    step.value = 'reset'
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '操作失败')
  } finally {
    busy.value = false
  }
}

async function reset() {
  if (newPassword.value.length < 6) return toast.error('新密码至少 6 位')
  busy.value = true
  try {
    await Api('/api/auth/forgot/reset', {
      method: 'POST',
      body: JSON.stringify({
        account: account.value.trim(),
        code: code.value.trim(),
        new_password: newPassword.value,
      }),
    })
    toast.success('密码已重置，请使用新密码登录')
    open.value = false
    step.value = 'send'
    account.value = ''
    code.value = ''
    newPassword.value = ''
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '重置失败')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Modal
    v-model:open="open"
    title="忘记密码"
    :description="step === 'send' ? '输入账号以接收邮箱验证码' : '输入验证码并设置新密码'"
    class="sm:max-w-sm"
  >
    <div class="flex flex-col gap-3">
      <div class="flex flex-col gap-1.5">
        <Label>用户名 / 邮箱</Label>
        <Input v-model="account" :disabled="step === 'reset'" />
      </div>
      <template v-if="step === 'reset'">
        <Input v-model="code" placeholder="邮箱验证码" />
        <Input v-model="newPassword" type="password" placeholder="新密码（至少 6 位）" />
      </template>
    </div>
    <template #footer>
      <Button variant="ghost" @click="open = false">关闭</Button>
      <Button v-if="step === 'send'" variant="primary" :disabled="busy" @click="send">
        <Spinner v-if="busy" />
        <template v-else>发送验证码</template>
      </Button>
      <Button v-else variant="primary" :disabled="busy" @click="reset">
        <Spinner v-if="busy" />
        <template v-else>重置密码</template>
      </Button>
    </template>
  </Modal>
</template>