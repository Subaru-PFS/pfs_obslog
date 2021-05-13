import { defineComponent, reactive } from "vue"
import MI from "~/components/MaterialIcon"
import { useVisitInspector } from "../useVisitInspector"
import BaseDetail from "./BaseDetail"
import VisitSetDetail from "./VisitSetDetail"
import './style.scss'
import SpsDetail from "./SpsDetail"
import MCSDetail from "./MCSDetail"
import VisitFitsHeader from "./VisitFitsHeader"
import Folder from "~/components/Folder"


export default defineComponent({
  setup() {
    const visitInspector = useVisitInspector()

    const $ = reactive({
      showJson: import.meta.env.DEV,
    })

    return () => <>
      <div class="visit-inspector" style={{ padding: '0 1em' }}>
        <Folder title={`PFS Visit (id=${visitInspector.$.m?.id})`} opened={true}>
          <BaseDetail />
        </Folder>
        {visitInspector.$.m?.sps && <>
          <Folder title="SpS Sequence">
            <VisitSetDetail />
          </Folder>
          <Folder title="SpS">
            <SpsDetail />
          </Folder>
        </>
        }
        {visitInspector.$.m?.mcs && <>
          <Folder title="MCS">
            <MCSDetail />
          </Folder>
        </>
        }
        <Folder title="FITS">
          <VisitFitsHeader visit={visitInspector.$.m!.id} />
        </Folder>
        <div class="end-h">
          <button onClick={e => $.showJson = !$.showJson}><MI icon='bug_report' /></button>
        </div>
        {$.showJson && <pre class="json">{JSON.stringify(visitInspector.$.m, null, 2)}</pre>}
      </div>
    </>
  },
})
