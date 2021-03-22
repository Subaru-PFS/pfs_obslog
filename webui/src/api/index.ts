import { ApiError, FetchArgType, Fetcher, Middleware } from "openapi-typescript-fetch"
import { paths } from './schema'


export const fetcher = Fetcher.for<paths>()

const errorHandler: Middleware = async (url, init, next) => {
  const response = await next(url, init).catch(error => {
    if (error instanceof ApiError) {
      switch (error.status) {
        case 409:
        case 422:
          break
        default:
          alert(`${error.status} ${error.statusText}:\n${JSON.stringify(error.data)}\nPlease Reload.`)
      }
    }
    throw error
  })
  return response
}

const baseUrl = import.meta.env['VITE_API_BASE_URL'] ?? '.'


fetcher.configure({
  baseUrl,
  use: [
    errorHandler,
  ]
})


export function apiUrl<P extends keyof paths>(path: P) {
  return {
    methods<M extends keyof paths[P]>(method: M) {
      const f = fetcher.path(path).method(method).create()
      return {
        create(params: FetchArgType<typeof f>) {
          // @ts-ignore
          const payload: Record<string, any> = params
          // https://github.com/ajaishankar/openapi-typescript-fetch/blob/2e0d66e8e5c7ef74dd406c810b8b2b61f5f5ae1e/src/fetcher.ts#L48
          let url = `${baseUrl}${path}`
          url = url.replace(/\{([^}]+)\}/g, (_, key) => {
            const value = encodeURIComponent(payload[key])
            delete payload[key]
            return value
          })
          const qs = queryString(payload)
          return `${url}${qs}`
        }
      }
    }
  }
}


// https://github.com/ajaishankar/openapi-typescript-fetch/blob/2e0d66e8e5c7ef74dd406c810b8b2b61f5f5ae1e/src/fetcher.ts
function queryString(params: Record<string, unknown>): string {
  const qs: string[] = []

  const encode = (key: string, value: unknown) =>
    `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`

  Object.keys(params).forEach((key) => {
    const value = params[key]
    if (value != null) {
      if (Array.isArray(value)) {
        value.forEach((value) => qs.push(encode(key, value)))
      } else {
        qs.push(encode(key, value))
      }
    }
  })

  if (qs.length > 0) {
    return `?${qs.join('&')}`
  }

  return ''
}
