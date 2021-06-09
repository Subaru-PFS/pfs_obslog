import { defineComponent, ref, watch } from "vue"
import { api } from "~/api"
import { VisitDetail } from "~/api-client"
import Folder from "~/components/Folder"
import MI from "~/components/MI"
import { makeComponentContext } from "~/vue-utils/context"
import { $reactive } from "~/vue-utils/reactive"
import BaseDetail from "./BaseDetail"
import MCSDetail from "./MCSDetail"
import SpsDetail from "./SpsDetail"
import style from './style.module.scss'
import VisitFitsHeader from "./VisitFitsHeader"
import VisitSetDetail from "./VisitSetDetail"


const VisitInspector = defineComponent({
  name: 'VisitInspector',
  setup($p, ctx) {
    const $c = inspectorContext.provide($p, ctx)

    const $ = $reactive({
      showJson: false,
      get visit() {
        return $c.$.visit!
      }
    })

    return () =>
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        <div
          ref={$c.el}
          class={style.main} style={{
            height: 0,
            flexGrow: 1,
            overflow: 'auto',
          }}>
          {$c.$.visit &&
            <>
              {$.visit.sps && $.visit.sps_sequence &&
                <Folder title="SpS Sequence" key="sps_sequence" opened={true}>
                  <VisitSetDetail />
                </Folder>
              }
              <Folder title={`PFS Visit (id=${$c.$.visit.id})`} opened={true} key="pfs_visit">
                <BaseDetail />
              </Folder>
              {$.visit.sps &&
                <Folder title={`SpS (type=${$c.$.visit.sps!.exp_type})`} opened={true} key="sps">
                  <SpsDetail />
                </Folder>
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
                <button data-tooltip="Debug Info" onClick={e => $.showJson = !$.showJson}><MI icon='bug_report' /></button>
              </div>
              {$.showJson && <pre><code>{JSON.stringify($c.$.visit, null, 2)}</code></pre>}
            </>
          }
        </div>
      </div>
  },
  props: {
    visitId: {
      type: Number,
    },
    revision: {
      type: Number,
      default: -1,
    }
  },
  emits: ['update:revision'],
})


export default VisitInspector


export const inspectorContext = makeComponentContext(VisitInspector, ($p, { emit }) => {
  const $ = $reactive({
    visit: undefined as VisitDetail | undefined,
  })

  const refresh = async () => {
    const visitId = $p.visitId
    $.visit = visitId ? (await api.visitDetail(visitId)).data : undefined
  }

  const notifyUpdate = () => {
    emit('update:revision', $p.revision + 1)
  }

  watch(() => [$p.visitId, $p.revision], () => refresh(), { immediate: true })

  const el = ref<HTMLDivElement>()

  return {
    $,
    $p,
    el,
    notifyUpdate,
    refresh,
  }
})
