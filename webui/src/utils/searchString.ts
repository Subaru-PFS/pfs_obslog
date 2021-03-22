// https://github.com/solidjs/solid-router/blob/87abbcc5abba8ff33d743fd8f7680692515379d9/src/utils.ts#L125
export function searchString(params: any) {
  const merged = new URLSearchParams('')
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === "") {
      merged.delete(key)
    } else {
      merged.set(key, String(value))
    }
  })
  const s = merged.toString()
  return s ? `?${s}` : ""
}
