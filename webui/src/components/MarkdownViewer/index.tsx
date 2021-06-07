import { defineAsyncComponent, defineComponent } from "vue"

const Loading = defineComponent({
  setup() {
    return () =>
      <div />
  }
})

export default defineAsyncComponent({
  loader: () => import('./impl'),
  loadingComponent: Loading,
  delay: 0,
})
