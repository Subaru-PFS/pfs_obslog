import { onCleanup } from 'solid-js'



export function useAddCleanUp() {
  const cbs: (() => unknown)[] = []
  const flush = () => {
    while (cbs.length > 0) {
      cbs.pop()!()
    }
  }
  onCleanup(flush)
  return Object.assign(
    (cb: () => unknown) => {
      cbs.push(cb)
    },
    {
      flush,
      remove(cb: () => unknown) {
        const index = cbs.indexOf(cb)
        if (index >= 0) {
          cbs.splice(index, 1)
        }
      },
    }
  )
}
