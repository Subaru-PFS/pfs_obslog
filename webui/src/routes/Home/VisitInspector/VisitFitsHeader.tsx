import { defineComponent, reactive, watch, watchEffect } from "vue"
import { api } from "~/api"
import { FitsMeta } from "~/api-client"
import FitsHeader, { Hdu } from "./FitsHeader"

export default defineComponent({
  setup($p) {
    const $ = reactive({
      fitsMetas: [] as FitsMeta[],
      selected: [] as string[],
    })

    watchEffect(async () => {
      // $.fitsMetas = []
      const fitsMetas = (await api.visitFits($p.visit)).data
      $.fitsMetas = fitsMetas
    })

    return () =>
      <>
        <div style={{ display: 'flex', height: '100%' }}>
          <select v-model={$.selected} multiple={true} style={{ fontFamily: 'monospace' }}>
            {
              $.fitsMetas.map(fm =>
                fm.hdul.map(hdul =>
                  <option value={`${fm.frameid}/${hdul.index}`} >{fm.frameid}[{hdul.index}]</option>
                )
              )
            }
          </select>
          <div style={{ flexGrow: 1, overflow: 'auto' }}>
            {$.selected.length > 0 &&
              $.fitsMetas.map(fm =>
                fm.hdul.map(hdul =>
                  $.selected.includes(`${fm.frameid}/${hdul.index}`) && <Hdu header={hdul.header} />
                )
              )
            }
          </div>
        </div>
      </>
  },
  props: {
    visit: {
      type: Number,
      required: true,
    }
  },
})