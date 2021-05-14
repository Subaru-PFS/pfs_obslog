import { reactive, computed } from "vue"

export function $reactive<T extends any>(o: T): T {
  const ds = Object.getOwnPropertyDescriptors(o)
  // @ts-ignore
  return reactive(Object.fromEntries(Object.keys(o).map(k => {
    const d = ds[k]
    return [
      k,
      // @ts-ignore
      d.get || d.set ? computed({ get: d.get, set: d.set }) : d.value
    ]
  })))
}