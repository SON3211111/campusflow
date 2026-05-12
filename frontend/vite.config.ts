import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: process.env.API_TARGET ?? 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ai': {
        target: process.env.AI_TARGET ?? 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ai/, ''),
      },
    },
  },
})
