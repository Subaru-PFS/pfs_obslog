import { computed, defineComponent, ref } from "@vue/runtime-core"
import { CSSProperties } from "@vue/runtime-dom"
import Color from "color"
import { MI } from "~/components/MaterialIcon"
import { router } from "~/router"
import { sessionLogout } from "~/session"
import { fgColor } from "~/utils/colors"
import { useKeyboardShortcuts } from "./useKeyboardShortcuts"
import { useVisitList } from "./useVisitList"

export default defineComponent({
  setup() {
    const visitList = useVisitList()
    
    useKeyboardShortcuts().add({
      '/': () => searchRef.value?.focus(),
      'r': () => visitList.refresh(),
    })

    const isSql = computed(() => visitList.q.filter.match(/^(?:where|order)\s/i))
    const searchRef = ref<null | HTMLInputElement>(null)

    const search = () => {
      // if (!isSql.value) {
      //   $.filter = translateToSql($.filter)
      // }
      visitList.refresh(true)
    }

    const logout = async (e: Event) => {
      e.preventDefault()
      await sessionLogout()
      router.push('/login')
    }

    const render = () => (
      <div style={{ display: 'flex' }}>
        <form onSubmit={e => { e.preventDefault(); search() }} style={formStyle}>
          <input
            v-model={visitList.q.filter}
            ref={searchRef}
            type="text"
            placeholder='Search'
            style={{
              ...searchStyle,
              ...(isSql.value ? sqlStyle : {})
            }}
          />
        </form>
        <button onClick={visitList.refresh} title="Refresh">{MI('refresh')}</button>
        <button onClick={() => router.push('/help')} title="Refresh">{MI('help')}</button>
        <button onClick={logout} title="Logout">{MI('exit_to_app')}</button>
      </div >
    )

    return render
  }
})

const formStyle: CSSProperties = {
  flexGrow: 1,
  margin: 0,
  padding: '2px',
}

const searchStyle: CSSProperties = {
  boxSizing: 'border-box',
  borderRadius: '8px',
  width: '100%',
  height: '100%',
  padding: '2px 4px',
  margin: 0,
}

const sqlStyle: CSSProperties = {
  fontFamily: 'monospace',
  color: fgColor(Color('cyan')).string(),
}