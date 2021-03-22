import { defineConfig } from 'vite'
import viteCompression from 'vite-plugin-compression'
import solidPlugin from 'vite-plugin-solid'
import tsconfigPaths from 'vite-tsconfig-paths'
import { viteStaticCopy } from 'vite-plugin-static-copy'


export default defineConfig({
  plugins: [
    solidPlugin(),
    tsconfigPaths(),
    viteCompression(),
    viteStaticCopy({
      targets: [
        {
          src: './node_modules/@stellar-globe/stellar-globe/dist/assets/*',
          dest: './assets'
        }
      ]
    })
  ],
  build: {
    target: 'esnext',
  },
  server: {
    fs: {
      // stellar-globe を npm link で開発する時用
      allow: ['.', '../lib-webui'],
    },
    proxy: {
      '/api/': 'http://127.0.0.1:8000',
    }
  },
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
    }
  }
})
