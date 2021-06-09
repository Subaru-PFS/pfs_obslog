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
      <AsyncButton data-tooltip="Refresh" onClick={$c.refresh}><MI icon="refresh"/></AsyncButton>
      <button data-tooltip="Attachments" onClick={() => router.push('/attachments')}><MI icon="folder"/></button>
      <button data-tooltip="Help" onClick={() => router.push('/help')}><MI icon="help"/></button>
      <AsyncButton data-tooltip="Logout" onClick={logout}><MI icon="exit_to_app"/></AsyncButton>
    </>
  },
})

const logout = async () => {
  await sessionLogout()
  router.push('/login')
}
