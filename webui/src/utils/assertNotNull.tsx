

export function assertNotNull<T>(a: T | undefined) {
  if (!a) {
    throw new Error(`Non null error`)
  }
  return a
}
