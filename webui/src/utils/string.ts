export function capitalize(s: string) {
  return s.replace(/_/g, ' ').replace(/(^|\s+)(\w)/g, (m, p1, p2: string) => `${p1}${p2.toUpperCase()}`)
}