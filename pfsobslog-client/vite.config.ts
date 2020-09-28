import { ServerConfig, UserConfig } from "vite/dist/node/config"
// @ts-ignore
import proxy from "koa-http2-proxy"

const serverConfig: ServerConfig = {
  configureServer: ({ app }) => {
    app.use(proxy(
      '/api',
      {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      }
    ))
  },
}

const userConfig: UserConfig = {}

export default { ...serverConfig, ...userConfig }
