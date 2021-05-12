import './style.scss'
import { defineComponent, inject, provide, reactive, ref, watchEffect } from "@vue/runtime-core"
import FlexScroll from "~/components/FlexScroll"
import Menu from './Menu'
import { useKeyboardShortcutsProvider } from "./useKeyboardShortcuts"
import { provideVisitInspector } from "./useVisitInspector"
import { provideUseVisitList } from "./useVisitList"
import VisitInspector from "./VisitInspector"
import VisitList from "./VisitList"
import SearchCondition from './SearchCondition'


const KEY = Symbol('home')

function provideHome() {
  const inspector = ref<null | HTMLDivElement>(null)
  const home = { inspector }
  provide(KEY, home)
  return home
}

export function useHome() {
  return inject<ReturnType<typeof provideHome>>(KEY)!
}


export default defineComponent({
  setup() {
    const home = provideHome()
    const visitList = provideUseVisitList()
    const visitInspector = provideVisitInspector()
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
            <FlexScroll scrollElement={home.inspector}>
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
