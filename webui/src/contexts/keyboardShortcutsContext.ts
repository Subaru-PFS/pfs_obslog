import { useEventListener } from "@vueuse/core"
import { makeContext } from "~/vue-utils/context"

export const keyboardShortcutsContext = makeContext('keyboard', () => {
  const keymap = new Map<string, (() => void)[]>()

  useEventListener(document, 'keydown', e => {
    if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
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
})
