import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import App from './App.vue'
import router from './router'
import { queryClient } from './lib/query'
import { setUnauthorizedHandler } from './lib/api'
import { useAuthStore } from './stores/auth'
import { useUiStore } from './stores/ui'
import 'vue-sonner/style.css'
import './styles/tailwind.css'

const app = createApp(App)

app.use(createPinia())
app.use(VueQueryPlugin, { queryClient })
app.use(router)

useUiStore().init()
setUnauthorizedHandler(() => {
  useAuthStore().clear()
  router.push('/')
})

app.mount('#app')