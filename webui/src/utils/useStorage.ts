import { createEffect, createSignal, on } from "solid-js"

function decode(raw: string) {
  // this method does not return undefined as long as the raw string is a valid JSON
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

const keyPrefix = `pfs-obslog/${import.meta.env.MODE}/`
const encode = JSON.stringify

export function useStorage<T>(bareKey: string, initialValue: T, storage: Storage) {
  const key = `${keyPrefix}${bareKey}`
  const raw = storage.getItem(key)
  const [signal, setSignal] = createSignal<T>(raw === null ? initialValue : (decode(raw) ?? initialValue))

  createEffect(on(signal, value => {
    storage.setItem(key, encode(value))
  }, { defer: true }))

  return [signal, setSignal] as [typeof signal, typeof setSignal]
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  return useStorage(key, initialValue, window.localStorage)
}
