import { defineComponent } from "@vue/runtime-core"
import { api } from "../api"
import { router } from "../router"

export default defineComponent({
  setup() {
    const logout = async (e: Event) => {
      e.preventDefault()
      await api.sessionDestroy()
      router.push('/login')
    }

    return () => (
      <>
        <div>HOME</div>
        <form onSubmit={logout}><input type="submit" value="Logout" /></form>
      </>
    )
  }
})
