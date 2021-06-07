import { defineComponent, onMounted, reactive } from "vue"


export default defineComponent({
  setup() {
    onMounted(function (this: unknown, ...args) {
      console.log(this)
      console.log(args)
      debugger
    })

    return () =>
      <>
        A
      </>
  },
})


const wm = new WeakMap()

const A = defineComponent({
  setup() {
    return () =>
      <></>
  },
})