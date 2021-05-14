import { inject, provide } from "vue"

export function makeContext<T, U extends unknown[]>(context: (...args: U) => T, name?: string) {
  const key = Symbol(name)
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
