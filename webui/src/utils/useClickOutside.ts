import { useAddCleanUp } from './useAddCleanUp'


type Options = {
  stopPropergation?: boolean
}


export function useClickOutside() {
  const addCleanUp = useAddCleanUp()

  const start = (el: HTMLElement, cb: () => unknown, options: Options = {}) => {
    const stopPropergation = options.stopPropergation ?? false

    const clear = () => {
      document.body.removeEventListener('click', onClick)
      addCleanUp.remove(clear)
    }
    const onClick = (e: MouseEvent) => {
      if (!el.contains(e.target as HTMLElement)) {
        if (stopPropergation) {
          e.stopPropagation()
        }
        clear()
        cb()
      }
    }
    document.body.addEventListener('click', onClick, { passive: true })
    addCleanUp(clear)
    return clear
  }

  return Object.assign(start, {
    clear: addCleanUp.flush,
  })
}
