<script setup lang="ts">
import { CheckCircle2, XCircle } from '@lucide/vue'
import Badge from '@/components/ui/Badge.vue'

defineProps<{ checked: boolean }>()
</script>

<template>
  <Badge :variant="checked ? 'success' : 'muted'">
    <CheckCircle2 v-if="checked" class="h-3.5 w-3.5" />
    <XCircle v-else class="h-3.5 w-3.5" />
    {{ checked ? '已打卡' : '未打卡' }}
  </Badge>
</template>