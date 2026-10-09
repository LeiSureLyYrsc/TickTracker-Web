<script setup lang="ts">
import Modal from '@/components/ui/Modal.vue'
import Button from '@/components/ui/Button.vue'
import { useConfirmStore } from '@/stores/confirm'

const store = useConfirmStore()
</script>

<template>
  <Modal
    v-model:open="store.open"
    :title="store.options.title"
    :description="store.options.message"
    class="sm:max-w-sm"
  >
    <template #footer>
      <Button variant="ghost" @click="store.settle(false)">
        {{ store.options.cancelText ?? '取消' }}
      </Button>
      <Button
        :variant="store.options.danger ? 'danger' : 'primary'"
        @click="store.settle(true)"
      >
        {{ store.options.confirmText ?? '确定' }}
      </Button>
    </template>
  </Modal>
</template>