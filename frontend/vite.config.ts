import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: '.',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // stellar-globe パッケージのエイリアス
      '@stellar-globe/stellar-globe': path.resolve(__dirname, '../external/stellar-globe/stellar-globe/dist/stellar-globe.js'),
      '@stellar-globe/react-stellar-globe': path.resolve(__dirname, '../external/stellar-globe/react-stellar-globe/dist/react-stellar-globe.es.js'),
      // 外部パッケージが同じReactインスタンスを使用するようにエイリアスを設定
      // （react-stellar-globeがバンドルしたReactではなく、メインプロジェクトのReactを使用）
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
  },
  server: {
    proxy: {
      // /api へのリクエストをバックエンド開発サーバーにプロキシ
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    // stellar-globe パッケージはプリバンドルから除外
    // （プリバンドルするとReactの参照が壊れる）
    exclude: ['@stellar-globe/stellar-globe', '@stellar-globe/react-stellar-globe'],
  },
})
