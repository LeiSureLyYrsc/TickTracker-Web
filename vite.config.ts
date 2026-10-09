import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

const outDir =
  process.env.TICKTRACKER_WEBUI_DIR ??
  fileURLToPath(new URL('../TickTracker/webui/frontend', import.meta.url))

const proxyTarget = process.env.TICKTRACKER_API ?? 'http://127.0.0.1:8080'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: { outDir, emptyOutDir: true },
  server: {
    proxy: {
      '/api': { target: proxyTarget, changeOrigin: true },
      '/avatars': { target: proxyTarget, changeOrigin: true },
      '/docs': { target: proxyTarget, changeOrigin: true },
      '/openapi.json': { target: proxyTarget, changeOrigin: true },
    },
  },
})