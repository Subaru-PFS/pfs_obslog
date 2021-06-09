export function runExclusively<U extends unknown[]>
  (
    cb: (...args: U) => Promise<void>,
    conflict: 'error' | 'donothing' = 'donothing'
  ):
  (...args: U) => Promise<void> {
  let running = false
  return async (...args: U) => {
    if (running) {
      if (conflict === 'error') {
        throw new Error("Simultaneous execution")
      }
    }
    else {
      running = true
      try {
        await cb(...args)
      } finally {
        running = false
      }
    }
  }
}


export function ignoreSequentialEvents<T extends Event>
  (cb: (e: T) => Promise<void>) {
  const f = runExclusively(cb)
  return (e: T) => {
    f(e)
  }
}

export function async_debounce<U extends unknown[]>
  (delay: number, cb: (...args: U) => Promise<void>) {
  let timer: null | ReturnType<typeof setTimeout> = null
  return (...args: U) => {
    if (timer === null) { // first call
      timer = setTimeout(() => timer = null, delay)
      cb(...args)
      return
    }
    if (timer) { // after 2nd calls
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      timer = null
      cb(...args)
    }, delay)
  }
}
