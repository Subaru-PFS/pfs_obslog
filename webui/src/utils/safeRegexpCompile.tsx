import { regexpEscape } from '../pages/Home/VisitDetail/FitsHeaderInfo/index'

export function safeRegexpCompile(pattern: string, flags: ConstructorParameters<typeof RegExp>[1]) {
  try {
    return new RegExp(pattern, flags)
  }
  catch {
    try {
      return new RegExp(regexpEscape(pattern), flags)
    } catch (e) {
      alert(`Failed to compile regepx: ${pattern}\n${JSON.stringify(e, null, 2)}`)
      return new RegExp('')
    }
  }
}
