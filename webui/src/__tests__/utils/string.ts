import { capitalize } from "~/utils/string"

test('capitalize', () => {
  expect(capitalize('refresh')).toBe('Refresh')
  expect(capitalize('exit_to_app')).toBe('Exit To App')
})
