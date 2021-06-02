import { defineComponent, reactive, watch, watchEffect } from "@vue/runtime-core"
import { api } from "~/api"
import { FitsMeta } from "~/api-client"
import FitsHeader from "./FitsHeader"

export default defineComponent({
  setup($$) {
    const $ = reactive({
      fitsMetas: [] as FitsMeta[],
    })

    watchEffect(async () => {
      // $.fitsMetas = []
      const fitsMetas = (await api.visitFits($$.visit)).data
      $.fitsMetas = fitsMetas
    })

    const render = () => (<>
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