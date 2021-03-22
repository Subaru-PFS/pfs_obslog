export function sleep(duration: number) {
  return new Promise<void>(resolve => {
    setTimeout(() => {
      resolve()
    }, duration)
  })
}


export function shortFormatTime(s?: string) {
  if (s) {
    return s.split('T')[1].slice(0, 5)
  }
}


export function shortFormatDate(s?: string) {
  if (s) {
    return s.split('T')[0]
  }
}


export async function timeit<T>(label: string, cb: () => Promise<T>) {
  const start = Number(new Date())
  try {
    return await cb()
  }
  finally {
    const duration = Number(new Date()) - start
    console.debug(`${label}: ${duration}`)
  }
}
