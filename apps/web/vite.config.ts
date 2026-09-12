import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5176,
    // Fail loudly instead of drifting to another port that the proxy docs don't mention.
    strictPort: true,
    // Same-origin API calls in dev: no CORS setup and no API URL env var needed in the app.
    proxy: {
      '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:8003',
    },
  },
})
