import { reactive, computed } from "vue"

// https://stackoverflow.com/a/64919133
class Wrapper<T extends {}>{
  wrapped(o: T) {
    return reactive(o)
  }
}

export function $reactive<T extends {}>(o: T): ReturnType<Wrapper<T>['wrapped']> {
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
