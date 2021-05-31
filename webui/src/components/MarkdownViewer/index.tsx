import { defineAsyncComponent } from "vue"
import Loading from "../Loading"

export default defineAsyncComponent({
  loader: () => import('./impl'),
  loadingComponent: Loading,
  delay: 0,
})
