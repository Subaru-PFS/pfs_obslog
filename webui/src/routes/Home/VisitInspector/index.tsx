import { defineComponent, reactive } from "vue"
import { MI } from "~/components/MaterialIcon"
import { useVisitInspector } from "../useVisitInspector"
import BaseDetail from "./BaseDetail"
import VisitSetDetail from "./VisitSetDetail"
import './style.scss'
import SpsDetail from "./SpsDetail"


export default defineComponent({
  setup() {
    const visitInspector = useVisitInspector()

    const $ = reactive({
      showJson: import.meta.env.DEV,
    })

    const render = () => {
      return (
        <div class="visit-inspector" style={{ padding: '0 1em' }}>
          <BaseDetail />
          <hr />
          {visitInspector.$.m?.sps && <>
            <VisitSetDetail />
            <hr />
            <SpsDetail />
            <hr />
          </>
          }
          <div class="end-h">
            <button onClick={e => $.showJson = !$.showJson}>{MI('bug_report')}</button>
          </div>
          { $.showJson && <pre class="json">{JSON.stringify(visitInspector.$.m, null, 2)}</pre>}
        </div>
      )
    }

    return render
  },
})
