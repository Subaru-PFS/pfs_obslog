import { defineComponent, watch } from "vue"
import { api, apiUrl } from "~/api"
import { Configuration, DefaultApiAxiosParamCreator, DefaultApiFp, FitsMeta } from "~/api-client"
import MI from "~/components/MI"
import { $reactive } from "~/vue-utils/reactive"
import { Hdu } from "./FitsHeader"
import style from './VisitFitsHeader.module.scss'

export default defineComponent({
  setup($p) {
    const $ = $reactive({
      fitsMetas: [] as FitsMeta[],
      selected: null as null | string,
      keywordSearch: '',
      valueSearch: '',
      commentSearch: '',
      get selectedIndex() {
        let i = 0
        for (const fm of $.fitsMetas) {
          for (const hdul of fm.hdul) {
            if ($.selected === `${fm.frameid}/${hdul.index}`) {
              return i
            }
            ++i
          }
        }
        return -1
      },
      set selectedIndex(index: number) {
        let i = 0
        for (const fm of $.fitsMetas) {
          for (const hdul of fm.hdul) {
            if (i === index) {
              $.selected = `${fm.frameid}/${hdul.index}`
              return
            }
            ++i
          }
        }
      }
    })

    // TODO: cleanup
    watch(() => $p.visit, async () => {
      const selectedIndex = $.selectedIndex
      const fitsMetas = (await api.listFitsMeta($p.visit)).data
      $.fitsMetas = fitsMetas
      $.selectedIndex = selectedIndex
    }, { immediate: true })

    const downloadFits = async (frameid: string) => {
      const url = await apiUrl(c => c.showFitsByFrameId($p.visit, frameid))
      location.href = url
    }

    return () =>
      <>
        <div style={{ display: 'flex', height: '100%' }}>
          <div
            class={style.fitsfilelist}
          >
            {$.fitsMetas.map(fm => (
              <div class={style.fitsfile}>
                <div>{fm.frameid}</div>
                <div style={{ display: 'flex' }}>
                  <div>
                    <button data-tooltip="Download" onClick={() => downloadFits(fm.frameid)}><MI icon="file_download" /></button>
                  </div>
                  <div style={{ flexGrow: 1 }} />
                  {fm.hdul.map(hdu =>
                    <button
                      onClick={() => $.selected = `${fm.frameid}/${hdu.index}`}
                      class={{ [style.active]: $.selected === `${fm.frameid}/${hdu.index}` }}
                    >{hdu.index}</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div style={{ flexGrow: 1, overflow: 'auto' }}>
            {$.selected !== null &&
              $.fitsMetas.map(fm =>
                fm.hdul.map(hdul =>
                  $.selected === `${fm.frameid}/${hdul.index}` &&
                  <Hdu
                    header={hdul.header}
                    v-models={[
                      [$.keywordSearch, 'keywordSearch'],
                      [$.valueSearch, 'valueSearch'],
                      [$.commentSearch, 'commentSearch'],
                    ]}
                  />
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