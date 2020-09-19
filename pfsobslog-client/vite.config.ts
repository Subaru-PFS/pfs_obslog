import { createJsxPlugin } from "vite-jsx/plugin"

export default {
  plugins: [createJsxPlugin()],
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    }
  }
}