<script setup lang="ts">
import { Check } from '@lucide/vue'
import Button from '@/components/ui/Button.vue'
import Spinner from '@/components/ui/Spinner.vue'

withDefaults(
  defineProps<{ checked: boolean; pending?: boolean; class?: string }>(),
  { pending: false, class: '' },
)
const emit = defineEmits<{ click: [] }>()
</script>

<template>
  <Button
    :variant="checked ? 'subtle' : 'primary'"
    :disabled="pending"
    :class="$props.class"
    @click="emit('click')"
  >
    <Spinner v-if="pending" />
    <Check v-else />
    {{ checked ? '再打卡 +1' : '打卡' }}
  </Button>
</template>