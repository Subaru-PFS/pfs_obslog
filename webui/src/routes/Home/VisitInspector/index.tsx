import { defineComponent } from "@vue/runtime-core"
import Folder from "~/components/Folder"
import MI from "~/components/MI"
import VisitFitsHeader from "./VisitFitsHeader"
import { $reactive } from "~/vue-utils/reactive"
import BaseDetail from "./BaseDetail"
import { inspectorContext } from "./inspectorContext"
import MCSDetail from "./MCSDetail"
import SpsDetail from "./SpsDetail"
import style from './style.module.scss'
import VisitSetDetail from "./VisitSetDetail"


export default defineComponent({
  setup($$) {
    const inspector = inspectorContext.provide($$)
    const $c = inspector.$
    const $ = $reactive({
      showJson: false,
      get visit() {
        return $c.visit!
      }
    })

    return () =>
      <div class={style.main} style={{ display: 'flex', flexDirection: 'column' }}>
        <div ref={inspector.el} style={{ flexGrow: 1, height: 0, overflowY: 'auto', paddingRight: '1em' }}>
          {$c.visit &&
            <>
              <Folder title={`PFS Visit (id=${$c.visit.id})`} opened={true} key="pfs_visit">
                <BaseDetail />
              </Folder>
              {$.visit.sps &&
                <>
                  {$.visit.sps_sequence &&
                    <>
                      <Folder title="SpS Sequence" key="sps_sequence" opened={true}>
                        <VisitSetDetail />
                      </Folder>
                    </>}
                  <Folder title={`SpS (type=${$c.visit.sps!.exp_type})`} opened={true} key="sps">
                    <SpsDetail />
                  </Folder>
                </>
              }
              {$.visit.mcs &&
                <>
                  <Folder title="mcs">
                    <MCSDetail />
                  </Folder>
                </>
              }
              <Folder title="FITS Header" key="fits_header" opened={false}>
                <VisitFitsHeader visit={$.visit.id} />
              </Folder>
              <div class="end-h">
                <button onClick={e => $.showJson = !$.showJson}><MI icon='bug_report' /></button>
              </div>
              {$.showJson && <pre><code>{JSON.stringify($c.visit, null, 2)}</code></pre>}
            </>
          }
        </div>
      </div>
  },
  props: {
    visitId: {
      type: Number,
    },
  },
})
