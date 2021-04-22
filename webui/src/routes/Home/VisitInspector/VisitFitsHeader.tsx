import { defineComponent, reactive, watch } from "@vue/runtime-core"
import { api, apiNoSpinnere } from "~/api"
import { FitsMeta } from "~/api-client"
import FitsHeader from "./FitsHeader"

export default defineComponent({
  setup($$) {
    const $ = reactive({
      fitsMetas: [] as FitsMeta[],
    })

    watch(() => $$.visit, async () => {
      const fitsMetas = (await apiNoSpinnere.visitFits($$.visit)).data
      $.fitsMetas = fitsMetas
    })

    const render = () => (<>
      <h2>FITS</h2>
      {
        $.fitsMetas.map(fm => (
          <FitsHeader meta={fm} />
        ))
      }
    </>)
    return render
  },
  props: {
    visit: {
      type: Number,
      required: true,
    }
  },
})