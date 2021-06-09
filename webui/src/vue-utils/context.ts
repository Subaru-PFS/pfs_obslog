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

type ExtractSetupParameters<T extends { setup?: (...args: any[]) => any }> = Parameters<NonNullable<T["setup"]>>

export function makeComponentContext
  <
    V extends { name?: string, setup?: (...args: any) => any },
    T,
  >
  (
    v: V,
    context: (
      props: ExtractSetupParameters<V>[0],
      ctx: ExtractSetupParameters<V>[1]) => T,
) {
  if (v.name === undefined) {
    throw new Error('Name must be set')
  }
  return makeContext(v.name, context)
}
