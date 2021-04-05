import './style.scss'
import { defineComponent, reactive, watchEffect } from "@vue/runtime-core"
import FlexScroll from "~/components/FlexScroll"
import Menu from './Menu'
import { useKeyboardShortcutsProvider } from "./useKeyboardShortcuts"
import { useVisitInspectorProvider } from "./useVisitInspector"
import { useVisitListProvider } from "./useVisitList"
import VisitInspector from "./VisitInspector"
import VisitList from "./VisitList"
import SearchCondition from './SearchCondition'


export default defineComponent({
  setup() {
    const visitList = useVisitListProvider()
    const visitInspector = useVisitInspectorProvider()
    useKeyboardShortcutsProvider()

    const render = () => {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Menu />
          <SearchCondition />
          {/* main view */}
          <div style={{ display: 'flex', flexGrow: 1 }}>
            {/* visit-list */}
            <VisitList v-model={[$.selectedId, 'selectedId']} />
            {/* inspector */}
            <FlexScroll>
              {visitInspector.$.m && <VisitInspector />}
            </FlexScroll>
          </div>
        </div>
      )
    }

    const $ = reactive({
      selectedId: null as null | number
    })

    watchEffect(() => {
      if ($.selectedId === null && visitList.$.visits[0]?.id) {
        $.selectedId = visitList.$.visits[0].id
      }
    })

    watchEffect(() => {
      if ($.selectedId !== null) {
        visitInspector.reload($.selectedId)
      }
    })

    return render
  }
})
