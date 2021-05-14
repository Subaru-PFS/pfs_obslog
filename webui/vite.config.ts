import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import tsconfigPaths from 'vite-tsconfig-paths'


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    tsconfigPaths(),
  ],
  server: {
    proxy: {
      '^/api/(?:fits_preview|session).*': {
        target: 'http://133.40.164.16',
        rewrite: (path) => path.replace(/^\/api/, '/obslog/api')
      },
      '/api/': 'http://localhost:8000',
    }
  },
})
