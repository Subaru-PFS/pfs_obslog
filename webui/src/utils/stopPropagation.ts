type Options = {
  stopPropagation?: boolean
  preventDefault?: boolean
}


export function stopEvent<E extends Event, T>(cb: () => T, options: Options = {}) {
  const stopPropagation = options.stopPropagation ?? true
  const preventDefault = options.preventDefault ?? true
  return (e: E) => {
    stopPropagation && e.stopPropagation()
    preventDefault && e.preventDefault()
    return cb()
  }
}
