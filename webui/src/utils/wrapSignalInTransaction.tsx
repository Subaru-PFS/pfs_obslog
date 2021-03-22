import { Accessor, createEffect, createSignal, startTransition } from "solid-js"

export function wrapSignalInTransaction<T>(source: Accessor<T>) {
  const [signal, setSignal] = createSignal<T>(source())
  createEffect(() => {
    startTransition(() => {
      setSignal(() => source())
    })
  })
  return signal
}
