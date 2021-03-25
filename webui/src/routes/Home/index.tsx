import { defineComponent, reactive } from "@vue/runtime-core"
import { api } from "~/api"
import { router } from "~/router"
import VisitInspector from "./VisitInspector"
import VisitList from "./VisitList"

export default defineComponent({
  setup() {
    const $ = reactive({
      selected_ids: [] as number[],
    })

    const logout = async (e: Event) => {
      e.preventDefault()
      await api.sessionDestroy()
      router.push('/login')
    }

    const render = () => {
      const inspectors = $.selected_ids.map(id => <VisitInspector key={id} id={id} />)

      return (
        <div class="fill-height" style={{ display: 'flex', flexDirection: 'column' }}>
          {/* menu */}
          <div style={{ display: 'flex' }}>
            🔍 <input type="text" style={{ flexGrow: 1 }} />
            <button onClick={logout}>👋 Logout</button>
          </div>
          {/* main view */}
          <div style={{ display: 'flex', flexGrow: 1 }}>
            {/* visit-list */}
            <VisitList onChange={e => $.selected_ids = e} />
            {/* inspector */}
            <div style={{ flexGrow: 1, position: 'relative' }}>
              <div style={{ position: 'absolute', width: '100%', height: '100%', overflow: 'auto' }}>
                {inspectors}
              </div>
            </div>
          </div>
        </div>
      )
    }

    return render
  }
})
