import './style.scss'
import { defineComponent, inject, provide, reactive, ref, watchEffect } from "@vue/runtime-core"
import Menu from './Menu'
import { useKeyboardShortcutsProvider } from "./useKeyboardShortcuts"
import { provideVisitInspector } from "./useVisitInspector"
import { provideUseVisitList } from "./useVisitList"
import VisitInspector from "./VisitInspector"
import VisitList from "./VisitList"
import SearchCondition from './SearchCondition'


const KEY = Symbol('home')

function provideHome() {
  const inspector = ref<HTMLDivElement | undefined>()
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
          {/* vlisit-list & inspector */}
          <div style={{ display: 'flex', flexGrow: 1 }}>
            {/* visit-list */}
            <VisitList v-model={[$.selectedId, 'selectedId']} />
            {/* inspector */}
            <div style={{ flexGrow: 1, position: 'relative' }} >
              <div ref={home.inspector} style={{ position: 'absolute', width: '100%', height: '100%', overflow: 'auto' }}>
                {visitInspector.$.m && <VisitInspector />}
              </div>
            </div>
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
