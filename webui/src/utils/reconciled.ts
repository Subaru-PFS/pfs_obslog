// we don't need such functions. Just using store of solid js was enough.


type Key<T> = (T extends (infer R)[] ?
  {
    key: (value: R, index: number) => unknown
    children?: Key<R>
  }
  :
  Partial<{
    [K in keyof T]: Key<T[K]>
  }>
)



export function reconciled<T>(original: Readonly<T>, target: T, key: Key<T>): T {
  try {
    return _reconciled(original, target, key)
  } catch (e) {
    console.error(e)
    return target
  }
}


function _reconciled<T>(original: Readonly<T>, target: T, key: Key<T>): T {
  const a = original
  const b = target

  if (Object.is(a, b)) {
    return a
  }
  if (Array.isArray(a)) {
    if (Array.isArray(b)) {
      // both a and b are arrays
      return reconciledArray(a, b, key as any) as T
    }
    // either a or b is not an array
    return b
  }
  if (a === null || b === null) {
    return b
  }
  if (typeof a === 'object' && typeof b === 'object') {
    let change = 0
    if (!setsAreEqual(new Set(Object.keys(a)), new Set(Object.keys(b)))) {
      throw new Error(`Object keys don't match: ${Object.keys(a)}, ${Object.keys(b)}`)
    }
    for (const k in b) {
      // @ts-ignore
      b[k] = _reconciled(a[k], b[k], key[k] ?? {})
      if (!Object.is(a[k], b[k])) {
        ++change
      }
    }
    if (change === 0) {
      return a
    }
  }
  // either a or b is a primitive value
  return b
}


function reconciledArray<T>(original: ReadonlyArray<T>, target: T[], key: Key<T[]>): T[] {
  if (key.key === undefined) {
    throw new Error(`key function is not supllied: ${JSON.stringify(original, null, 2)}, ${JSON.stringify(target, null, 2)}`)
  }

  const a = original
  const b = target

  if (key.key === undefined) {
    throw new Error(`no key func`)
  }

  const aMap = new Map(a.map((value, i) => [key.key(value, i), value]))

  if (aMap.size !== a.length) {
    throw new Error(`Duplicated keys: ${a}`)
  }

  let only_b = 0, a_and_b = 0, changed = 0

  for (let i = 0; i < b.length; ++i) {
    const bValue = b[i]
    const bKey = key.key?.(bValue, i) ?? i
    const aValue = aMap.get(bKey)
    if (aValue !== undefined) {
      // this item is exists in both a and b
      // @ts-ignore
      b[i] = _reconciled(aValue, b[i], key.children ?? {})
      ++a_and_b
      if (!Object.is(aValue, b[i])) {
        ++changed
      }
    }
    else {
      // this item is newly added.
      // we need to do nothing.
      ++only_b
    }
  }
  const only_a = a.length - a_and_b
  if (changed === 0 && only_a === 0 && only_b === 0) {
    // @ts-ignore
    return a
  }
  return b
}

// https://bobbyhadz.com/blog/javascript-check-if-two-sets-are-equal
function setsAreEqual<T>(a: Set<T>, b: Set<T>) {
  if (a.size !== b.size) {
    return false
  }
  return Array.from(a).every(element => {
    return b.has(element)
  })
}
