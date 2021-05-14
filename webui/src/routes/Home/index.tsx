import { defineComponent } from "vue"
import MI from "~/components/MI"
import { router } from "~/router"
import { sessionLogout } from "~/session"
import { homeContext } from "./homeContext"
import SearchBox from "./SearchBox"
import SearchConditions from "./SearchCondition"
import VisitDetail from "./VisitInspector"
import VisitList from "./VisitList"

export default defineComponent({
  setup() {
    const home = homeContext.provide()

    return () =>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex' }}>
          <MI style={{ alignSelf: 'center' }} icon="search"></MI>
          <SearchBox style={{ flexGrow: 1 }} />
          <button onClick={home.refresh} ><MI icon="refresh" /></button>
          <button onClick={help}><MI icon="help" /></button>
          <button onClick={logout}><MI title="Logout" icon="exit_to_app" /></button>
        </div>
        <SearchConditions />
        <div style={{ flexGrow: 1, display: 'flex' }}>
          <VisitList />
          <VisitDetail style={{ flexGrow: 1 }} visitId={home.$.selectedVisitId} />
        </div>
      </div>
  }
})

async function logout(e: Event) {
  e.preventDefault()
  await sessionLogout()
  router.push('/login')
}

function help() {
  router.push('/help')
}
