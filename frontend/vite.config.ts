import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // /obslog/api へのリクエストをバックエンド開発サーバーにプロキシ
      '/obslog/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
