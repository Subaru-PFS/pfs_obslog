export function vModel<T>(value: T, set: (value: T) => void) {
  return {
    value,
    onInput(e: any) {
      set(e.target.value)
    },
  }
}

export function vModelCheckbox(value: boolean, set: (value: boolean) => void) {
  return {
    checked: value,
    onChange(e: any) {
      set(e.target.checked)
    },
  }
}
