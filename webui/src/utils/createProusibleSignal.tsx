import produce from "immer"
import { createSignal, Setter } from "solid-js"


type ProduceSignalGetter<T> = () => T


type ProduceSignalSetter<T> = Setter<T> & {
  produce: (fn: (value: T) => unknown) => void
}


export type ProduceSignal<T> = [ProduceSignalGetter<T>, ProduceSignalSetter<T>]


export function createProducibleSignal<T>(initial: T): ProduceSignal<T> {
  const [v, setV] = createSignal<T>(initial)
  const setter = Object.assign(setV, {
    produce: (fn: (state: T) => void) => {
      const v2 = produce(v(), fn)
      // @ts-ignore
      setV(v2)
    },
  })
  return [v, setter]
}
