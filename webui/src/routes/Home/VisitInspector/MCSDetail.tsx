import { CSSProperties } from "@vue/runtime-dom"
import { usePreferredDark } from "@vueuse/core"
import { defineComponent, ref } from "vue"
import { api, apiUrl } from "~/api"
import LazyImage from "~/components/LazyImage"
import { $reactive } from "~/vue-utils/reactive"
import { inspectorContext } from "./"
import NoteList from "../components/NoteList"
import Folder from "~/components/Folder"

export default defineComponent({
  setup() {
    const isDark = usePreferredDark()
    const $c = inspectorContext.inject()
    const $ = $reactive({
      get mcs() {
        return $c.$.visit!.mcs!
      },
      get dls() {
        return $.mcs.exposures.map(e => ref<HTMLDListElement>())
      },
    })
    const exposureLinksEl = ref<HTMLDivElement>()

    return () =>
      <>
        <dl>
          <dt>Exposures</dt>
          <dd>
            {/* links */}
            <div style={stickyHeader} ref={exposureLinksEl} >
              {$.mcs.exposures.map((e, i) => <button onClick={_ => {
                scrollIntoViewWithFixedHeader({
                  parent: $c.el.value!,
                  // @ts-ignore
                  target: $.dls[i]!.value,
                  header: exposureLinksEl.value!,
                })
              }}>{e.frame_id}</button>)}
            </div>
            {
              $.mcs.exposures.map((e, i) => <>
                <div ref={$.dls[i]}></div>
                <Folder title={`Frame ID: ${e.frame_id}`}>
                  <div style={{ display: 'inline-block', margin: '0.5em 0' }}>
                    <LazyImage
                      width={640} height={480}
                      scrollTarget={$c.el}
                      src={apiUrl(c => c.showMcsFitsPreview($c.$.visit?.id!, e.frame_id, 640, 480))} />
                  </div>
                  <div style={{ display: 'inline-block', margin: '0.5em 0' }}>
                    <LazyImage
                      width={640} height={480}
                      scrollTarget={$c.el}
                      src={apiUrl(c => c.showMcsDataChart(e.frame_id, 640, 480, isDark.value ? 'dark' : 'light'))} />
                  </div>
                  <Folder title="Details" opened={false}>
                    <dl>
                      <dt>exptime</dt>
                      <dd>{e.exptime}</dd>
                      <dt>altitude</dt>
                      <dd>{e.altitude}</dd>
                      <dt>azimuth</dt>
                      <dd>{e.azimuth}</dd>
                      <dt>insrot</dt>
                      <dd>{e.insrot}</dd>
                      <dt>adc_pa</dt>
                      <dd>{e.adc_pa}</dd>
                      <dt>dome_temperature</dt>
                      <dd>{e.dome_temperature}</dd>
                      <dt>dome_pressure</dt>
                      <dd>{e.dome_pressure}</dd>
                      <dt>dome_humidity</dt>
                      <dd>{e.dome_humidity}</dd>
                      <dt>outside_temperature</dt>
                      <dd>{e.outside_temperature}</dd>
                      <dt>outside_pressure</dt>
                      <dd>{e.outside_pressure}</dd>
                      <dt>outside_humidity</dt>
                      <dd>{e.outside_humidity}</dd>
                      <dt>mcs_cover_temperature</dt>
                      <dd>{e.mcs_cover_temperature}</dd>
                      <dt>mcs_m1_temperature</dt>
                      <dd>{e.mcs_m1_temperature}</dd>
                      <dt>taken_at</dt>
                      <dd>{e.taken_at}</dd>
                    </dl>
                  </Folder>
                  <dl>
                    <dt>Notes</dt>
                    <dd>
                      <NoteList
                        notes={e.notes}
                        createNote={async body => {
                          const mcs_exposure_frame_id = e.frame_id
                          await api.createMcsExposureNote({ mcs_exposure_frame_id, body })
                        }}
                        updateNote={(note_id, body) => api.updateMcsExposureNote(note_id, { body })}
                        deleteNote={note_id => api.destroyMcsExposureNote(note_id)}
                        refresh={$c.notifyUpdate}
                      />
                    </dd>
                  </dl>
                  <hr />
                </Folder>
              </>)
            }
          </dd>
        </dl>
      </>
  }
})

const stickyHeader: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 1, // animation loader has a new stacking context.
  margin: '0.5em 0',
  backgroundColor: 'rgba(127, 127, 127, 0.5)',
  opacity: 0.95,
}

type ScrollOption = {
  parent: HTMLElement
  target: HTMLElement
  header: HTMLElement
}

function scrollIntoViewWithFixedHeader({ parent, target, header }: ScrollOption) {
  const topOfElement = target.offsetTop
  const s = getComputedStyle(header)
  const margin = parseFloat(s.marginTop) + parseFloat(s.marginBottom)
  parent.scroll({ top: topOfElement - header.scrollHeight - margin })
}
