import { Component, lazy } from 'solid-js'

export function lazyNamedComponent<M, C extends Component>(importPromise: Promise<M>, pickComponent: (module: M) => C) {
  return lazy(async () => {
    const module = await importPromise
    return { default: pickComponent(module) }
  })
}
