import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // stellar-globe パッケージのエイリアス
      '@stellar-globe/stellar-globe': path.resolve(__dirname, '../external/stellar-globe/stellar-globe/dist/stellar-globe.js'),
      '@stellar-globe/react-stellar-globe': path.resolve(__dirname, '../external/stellar-globe/react-stellar-globe/dist/react-stellar-globe.es.js'),
    },
  },
  server: {
    proxy: {
      // /obslog/api へのリクエストをバックエンド開発サーバーにプロキシ
      '/obslog/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['@stellar-globe/stellar-globe', '@stellar-globe/react-stellar-globe'],
  },
})
