import { inject, provide } from "@vue/runtime-core"
import { useEventListener } from "@vueuse/core"

const KEY = Symbol('keyboard-shortcuts')


function makeProvider() {
  const keymap = new Map<string, (() => void)[]>()

  useEventListener(document, 'keydown', e => {
    if (!(e.target instanceof HTMLInputElement)) {
      const cbs = keymap.get(e.key) || []
      if (cbs.length > 0 && !(e.metaKey || e.ctrlKey)) {
        e.preventDefault()
      }
      for (const cb of cbs) {
        cb()
      }
    }
  })

  return {
    add(map: { [key: string]: () => void }) {
      for (const key in map) {
        if (!keymap.has(key)) {
          keymap.set(key, [])
        }
        keymap.get(key)!.push(map[key])
      }
    },
  }
}


export function useKeyboardShortcutsProvider() {
  const provider = makeProvider()
  provide(KEY, provider)
  return provider
}


export function useKeyboardShortcuts() {
  const controller = inject<ReturnType<typeof makeProvider>>(KEY)!
  return controller
}
