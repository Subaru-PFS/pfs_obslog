// export function debounce<T>(delay: number, cb: () => void) {
//   let timer: null | ReturnType<typeof setTimeout> = null

//   return () => {
//     if (timer === null) {
//       timer = setTimeout(() => timer = null, delay)
//       cb()
//       return
//     }
//     if (timer) {
//       clearTimeout(timer)
//       timer = null
//     }
//     timer = setTimeout(() => {
//       timer = null
//       cb()
//     }, delay)
//   }
// }

export function async_debounce<T, U extends unknown[]>
  (delay: number, cb: (...args: U) => Promise<T>):
  (...args: U) => Promise<T> {
  let timer: null | ReturnType<typeof setTimeout> = null
  return (...args: U) => new Promise<T>(async resolve => {
    if (timer === null) {
      timer = setTimeout(() => timer = null, delay)
      resolve(cb(...args))
      return
    }
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    timer = setTimeout(() => {
      timer = null
      resolve(cb(...args))
    }, delay)
  })
}
