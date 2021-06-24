import { defineComponent } from "vue"
import { showApiSpinner } from "~/api"
import AsyncButton from "~/components/AsyncButton"
import MI from "~/components/MI"
import { router } from "~/router"
import { sessionLogout } from "~/session"
import { homeContext } from "./homeContext"
import style from './style.module.scss'


export const MenuButtons = defineComponent({
  name: import.meta.url,
  setup() {
    const refresh = () => {
      showApiSpinner()
      $c.refresh()
    }

    const $c = homeContext.inject()
    return () => <>
      <AsyncButton
        class={{ [style.active]: $c.$.autoRefresh }}
        data-tooltip={$c.$.autoRefresh ? 'Refresh now (refreshed every 30s)' :  "Refresh"}
        onClick={refresh}
      ><MI icon="refresh" /></AsyncButton>
      <button data-tooltip="Attachments" onClick={() => router.push('/attachments')}><MI icon="folder" /></button>
      <button data-tooltip="Help" onClick={() => router.push('/help')}><MI icon="help" /></button>
      <AsyncButton data-tooltip="Logout" onClick={logout}><MI icon="exit_to_app" /></AsyncButton>
    </>
  },
})

const logout = async () => {
  await sessionLogout()
  router.push('/login')
}
