import { reactive } from "@vue/reactivity"

const $g = reactive({
  session: {
    account_name: null as null | string,
  }
})

export { $g }