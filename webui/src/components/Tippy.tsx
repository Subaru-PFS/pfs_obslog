import { createEffect, onCleanup, onMount } from "solid-js"
import Tippy, { Instance } from 'tippy.js'
import 'tippy.js/dist/tippy.css'


export type TippyProps = Parameters<typeof Tippy>[1]


export function tippy(el: HTMLElement, propsAccessor: () => TippyProps | undefined) {
  let t: Instance | undefined = undefined
  onMount(() => {
    const props = propsAccessor()
    if (props) {
      t = Tippy(el, {
        animation: false,
        placement: 'bottom',
        ...props
      })
      createEffect(() => {
        const newProps = propsAccessor()
        newProps && t?.setProps(newProps)
      })
    }
  })
  onCleanup(() => {
    t?.destroy()
  })
}

declare module "solid-js" {
  namespace JSX {
    interface Directives {
      tippy: TippyProps | undefined
    }
  }
}
