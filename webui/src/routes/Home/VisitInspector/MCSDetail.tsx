import { defineComponent, ref } from "@vue/runtime-core"
import { CSSProperties } from "@vue/runtime-dom"
import { usePreferredDark } from "@vueuse/core"
import { api } from "~/api"
import AddButton from "~/components/AddButton"
import LazyImage from "~/components/LazyImage"
import MI from "~/components/MI"
import { $g } from "~/global"
import { int } from "~/types"
import { $reactive } from "~/vue-utils/reactive"
import { inspectorContext } from "./inspectorContext"

export default defineComponent({
  setup() {
    const isDark = usePreferredDark()
    const inspector = inspectorContext.inject()
    const $c = inspector.$
    const $ = $reactive({
      get mcs() {
        return $c.visit!.mcs!
      },
      get dls() {
        return $.mcs.exposures.map(e => ref<HTMLDListElement>())
      },
    })
    const exposureLinksEl = ref<HTMLDivElement>()
    const addNote = async (mcs_exposure_frame_id: int, body: string) => {
      await api.mcsExposureNoteCreate({ mcs_exposure_frame_id, body })
      inspector.refresh()
    }

    const editNote = async (visit_note_id: int, initial: string) => {
      const body = prompt(undefined, initial)
      if (body !== null) {
        if (body.length > 0) {
          await api.mcsExposureNoteUpdate(visit_note_id, { body })
        }
        else {
          await api.mcsExposureNoteDestroy(visit_note_id)
        }
        inspector.refresh()
      }
    }

    return () =>
      <>
        <dl>
          <dt>Exposures</dt>
          <dd>
            <div style={stickyHeader} ref={exposureLinksEl} >
              {$.mcs.exposures.map((e, i) => <button onClick={_ => {
                scrollIntoViewWithFixedHeader({
                  parent: inspector.el.value!,
                  // @ts-ignore
                  target: $.dls[i]!.value,
                  header: exposureLinksEl.value!,
                })
              }}>{e.frame_id}</button>)}
            </div>
            {
              $.mcs.exposures.map((e, i) => <>
                <h4 ref={$.dls[i]}>Frame ID: {e.frame_id}</h4>
                <div style={{ display: 'inline-block' }}>
                  <LazyImage
                    width={640} height={480}
                    scrollTarget={inspector.el}
                    src={`./api/mcs_data_chart/${e.frame_id}?width=640&height=480&theme=${isDark.value ? 'dark' : 'light'}`} />
                </div>
                <dl>
                  {/* <dt>frame_id</dt>
                  <dd>{e.frame_id}</dd> */}
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
                  <dt>Notes</dt>
                  <dd>
                    <ul class="notes">
                      {e.notes.slice().sort((a, b) => a.id - b.id).map(n =>
                        <li key={n.id}>
                          <div style={{ display: 'flex', alignItems: 'baseline' }}>
                            <div style={{ flexGrow: 1 }}>{n.body}</div>
                            <div class="username">{n.user.account_name}</div>
                            <button
                              onClick={() => editNote(n.id, n.body)}
                              disabled={$g.session!.user.id !== n.user.id}
                            > <MI icon='edit' /></button>
                          </div>
                        </li>
                      )}
                      <li>
                        <AddButton onSubmit={(note) => addNote(e.frame_id, note)} />
                      </li>
                    </ul>
                  </dd>
                </dl>
                <hr />
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
  opacity: 0.75,
}

type ScrollOption = {
  parent: HTMLElement
  target: HTMLElement
  header: HTMLElement
}

function scrollIntoViewWithFixedHeader({ parent, target, header }: ScrollOption) {
  // FIXME
  const topOfElement = target.offsetTop - header.getBoundingClientRect().height
  const s = getComputedStyle(header)
  const margin = parseFloat(s.marginTop) + parseFloat(s.marginBottom)
  parent.scroll({ top: topOfElement - margin - 100 })
}