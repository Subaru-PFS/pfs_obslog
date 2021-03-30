import { defineComponent, reactive } from "@vue/runtime-core"
import FlexScroll from "~/components/FlexScroll"
import { $g } from "~/global"
import { router } from "~/router"
import { sessionLogout } from "~/session"
import VisitInspector from "./VisitInspector"
import VisitList from "./VisitList"

export default defineComponent({
  setup() {
    const $ = reactive({
      selected_ids: [] as number[],
    })

    const logout = async (e: Event) => {
      e.preventDefault()
      await sessionLogout()
      router.push('/login')
    }

    const render = () => {
      const inspectors = $.selected_ids.map(id => <VisitInspector key={id} id={id} />)

      return (
        <div class="fill-height" style={{ display: 'flex', flexDirection: 'column' }}>
          {/* menu */}
          <pre>{JSON.stringify($g)}</pre>
          <div style={{ display: 'flex' }}>
            🔍 <input type="text" style={{ flexGrow: 1 }} />
            <button onClick={logout}>👋 Logout</button>
          </div>
          {/* main view */}
          <div style={{ display: 'flex', flexGrow: 1 }}>
            {/* visit-list */}
            <VisitList onChange={e => $.selected_ids = e} />
            {/* inspector */}
            <FlexScroll>
              {inspectors}
            </FlexScroll>
          </div>
        </div>
      )
    }

    return render
  }
})
