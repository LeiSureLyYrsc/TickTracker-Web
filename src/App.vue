<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'
import { Toaster } from 'vue-sonner'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const toastTheme = computed(() => (ui.theme === 'light' ? 'light' : 'dark'))
</script>

<template>
  <RouterView v-slot="{ Component }">
    <Transition name="page" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>
  <Toaster position="top-center" :rich-colors="true" :theme="toastTheme" close-button />
</template>

<style>
.page-enter-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.page-leave-active {
  transition: opacity 0.12s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.page-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition: none;
  }
}
</style>