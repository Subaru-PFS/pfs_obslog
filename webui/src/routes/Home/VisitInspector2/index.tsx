import { defineComponent, reactive } from "@vue/runtime-core"

export default defineComponent({
  setup() {
    const $ = reactive(new class {
      x = 0
    })

    $.x = 3

    const render = () => (<></>)
    return render
  },
})
