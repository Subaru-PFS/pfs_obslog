import { watch } from "vue"
import { $reactive } from "~/vue-utils/reactive"

test('$reactive', () => {
  const cb = jest.fn(() => { })

  const $ = $reactive({
    x: 2,
    get y() {
      cb()
      return 2 * $.x
    },
    set y(value: number) {
      $.x = value / 2
    },
  })

  expect($.x).toBe(2)
  expect(cb.mock.calls.length).toBe(0)
  expect($.y).toBe(4)
  expect(cb.mock.calls.length).toBe(1)
  expect($.y).toBe(4)
  expect(cb.mock.calls.length).toBe(1)
  $.y = 6
  expect($.x).toBe(3)
  expect($.y).toBe(6)
  expect($.y).toBe(6)
  expect(cb.mock.calls.length).toBe(2)
})

test('$reactive with watch', () => {
  const $ = $reactive({
    x: 1,
    get y() {
      return $.x * 2
    },
  })

  const cb = jest.fn(() => { })
  expect(cb.mock.calls.length).toBe(0)
  watch(() => $.y, cb, { flush: 'sync' })
  expect(cb.mock.calls.length).toBe(0)
  $.x = 2
  expect(cb.mock.calls.length).toBe(1)
})
