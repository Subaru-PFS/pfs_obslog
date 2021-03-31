export function debounce<T>(delay: number, cb: () => void | Promise<void>) {
  let timer: null | ReturnType<typeof setTimeout> = null

  return () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    timer = setTimeout(cb, delay)
  }
}
