import { createSignal } from 'solid-js'

export function useRefresh() {
  const [signal, setSignal] = createSignal({})
  const refresh = () => {
    setSignal({})
  }
  return [
    signal,
    refresh,
  ]
}
