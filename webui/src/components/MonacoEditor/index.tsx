import { defineAsyncComponent, defineComponent } from "@vue/runtime-core"

const Loading = defineComponent({
  setup() {
    return () =>
      <div>Loading...</div>
  }
})

export default defineAsyncComponent({
  loader: () => import('./impl'),
  loadingComponent: Loading,
  delay: 0,
})
