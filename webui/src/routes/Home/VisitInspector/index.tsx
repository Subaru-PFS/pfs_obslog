//@ts-ignore
import { Pane, Splitpanes } from 'splitpanes'
import { defineComponent, ref, watch, onMounted } from "vue"
import { apiFactory } from "~/api"
import { VisitDetail } from "~/api-client"
import Folder from "~/components/Folder"
import { makeComponentContext } from "~/vue-utils/context"
import { $reactive } from "~/vue-utils/reactive"
import AGCDetail from './AGCDetail'
import BaseDetail from "./BaseDetail"
import MCSDetail from "./MCSDetail"
import SpsDetail from "./SpsDetail"
import VisitFitsHeader from "./VisitFitsHeader"
import VisitSetDetail from "./VisitSetDetail"


const VisitInspector = defineComponent({
  name: 'VisitInspector',
  setup($p, ctx) {
    const $c = inspectorContext.provide($p, ctx)

    const $ = $reactive({
      folders: {
        visitSetDetail: false,
      },
      showJson: false,
      get visit() {
        return $c.$.visit!
      },
    })

    const pane = ref()
    watch(() => pane.value, () => {
      if (pane.value) {
        try {
          if (!pane.value.$el.matches('.splitpanes__pane')) {
            throw new Error(`Unexpected $el`)
          }
          $c.el.value = pane.value.$el
        }
        catch (e) {
          alert(`Error during obtaining pane element: ${e}`)
        }
      }
    }, { flush: 'sync' })

    return () =>
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        <div
          style={{
            height: 0,
            flexGrow: 1,
          }}>
          {$c.$.visit &&
            <Splitpanes horizontal={true}>
              <Pane ref={pane}>
                {$.visit.sps && $.visit.sps_sequence &&
                  <Folder title="SpS Sequence" key="sps_sequence" opened={$.folders.visitSetDetail}>
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
                    <Folder title="MCS">
                      <MCSDetail />
                    </Folder>
                  </>
                }
                {
                  $.visit.agc &&
                  <>
                    <Folder title="AGC">
                      <AGCDetail />
                    </Folder>
                  </>
                }
              </Pane>
              <Pane size={20}>
                <VisitFitsHeader visit={$.visit.id} />
              </Pane>
            </Splitpanes>
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

  const refresh = async (spinner = true) => {
    const visitId = $p.visitId
    $.visit = visitId ? (await apiFactory({ spinner }).showVisit(visitId)).data : undefined
  }

  const notifyUpdate = () => {
    emit('update:revision', $p.revision + 1)
  }

  watch(
    () => $p.visitId,
    () => refresh(),
    { immediate: true }
  )

  watch(
    () => $p.revision,
    () => refresh(false),
  )

  const el = ref<HTMLDivElement>()

  return {
    $,
    $p,
    el,
    notifyUpdate,
    refresh,
  }
})
