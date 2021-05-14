export function safeJsonParse<T>(json: any, onFail: () => T): T {
  if (json) {
    try {
      return JSON.parse(String(json))
    }
    catch { }
  }
  return onFail()
}
