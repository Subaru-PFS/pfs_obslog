import { defineAsyncComponent } from "@vue/runtime-core"
import Loading from "../Loading"

export default defineAsyncComponent({
  loader: () => import('./impl'),
  loadingComponent: Loading,
  delay: 0,
})
