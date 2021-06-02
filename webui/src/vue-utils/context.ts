import { inject, provide } from "vue"

export function makeContext<T, U extends unknown[]>(name: string, context: (...args: U) => T) {
  const key = `PFS_OBSLOG_CONTEXT_${name}`
  return {
    provide(...args: U) {
      const ctx = context(...args)
      provide(key, ctx)
      return ctx
    },
    inject() {
      return inject<T>(key)!
    },
  }
}
