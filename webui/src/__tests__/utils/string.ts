import { capitalize, suffix } from "~/utils/string"

test('capitalize', () => {
  expect(capitalize('refresh')).toBe('Refresh')
  expect(capitalize('exit_to_app')).toBe('Exit To App')
})


test('suffix', () => {
  expect(suffix('a.b.c.png')).toBe('png')
  expect(suffix('a/b/c.d.png')).toBe('png')
  expect(suffix('a/b/c')).toBe('')
  expect(suffix('a/b/c.PNG')).toBe('png')
})