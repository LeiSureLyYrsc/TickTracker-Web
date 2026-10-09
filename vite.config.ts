import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 构建产物默认输出到同级 TickTracker 插件的 webui/frontend，
// 亦可通过环境变量 TICKTRACKER_WEBUI_DIR 覆盖（例如作者 monorepo 的
// ../plugins/commision_tracker/webui/frontend）。
const outDir =
  process.env.TICKTRACKER_WEBUI_DIR ?? fileURLToPath(new URL('../TickTracker/webui/frontend', import.meta.url))

const proxyTarget = process.env.TICKTRACKER_API ?? 'http://127.0.0.1:8080'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir,
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': { target: proxyTarget, changeOrigin: true },
      '/avatars': { target: proxyTarget, changeOrigin: true },
      '/docs': { target: proxyTarget, changeOrigin: true },
      '/openapi.json': { target: proxyTarget, changeOrigin: true },
    },
  },
})
