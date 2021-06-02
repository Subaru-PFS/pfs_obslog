import { defineComponent } from "vue"
import AsyncButton from "~/components/AsyncButton"
import MI from "~/components/MI"
import { router } from "~/router"
import { sessionLogout } from "~/session"
import { homeContext } from "./homeContext"

export const MenuButtons = defineComponent({
  name: import.meta.url,
  setup() {
    const $c = homeContext.inject()
    return () => <>
      <AsyncButton onClick={$c.refresh}><MI icon="refresh" /></AsyncButton>
      <button onClick={() => router.push('/attachments')}><MI icon="folder" /></button>
      <button onClick={() => router.push('/help')}><MI icon="help" /></button>
      <AsyncButton onClick={logout}><MI title="Logout" icon="exit_to_app" /></AsyncButton>
    </>
  },
})

const logout = async () => {
  await sessionLogout()
  router.push('/login')
}
