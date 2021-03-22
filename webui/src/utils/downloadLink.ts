export function downloadLink(href: string, filename: string) {
  const a = document.createElement('a')
  document.body.appendChild(a)
  a.download = filename
  a.href = href
  a.click()
  a.remove()
}
