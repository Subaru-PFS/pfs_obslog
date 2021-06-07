export function sleep(duration: number) {
  return new Promise<void>(resolve => {
    setTimeout(() => {
      resolve()
    }, duration)
  })
}


export function shortFormat(s?: string) {
  if (s) {
    return s.split('T')[1].slice(0, 5)
  }
}
