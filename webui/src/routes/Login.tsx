import { defineComponent, onMounted, reactive } from "@vue/runtime-core"
import { api } from "../api"
import { ref } from "vue"
import { router } from "../router"


export default defineComponent({
  setup() {
    const $ = reactive({
      username: '',
      password: '',
    })

    const onSubmit = async (e: Event) => {
      e.preventDefault()
      const { username, password } = $
      try {
        await api.sessionCreate({ username, password })
        router.push('/')
      } catch {
        alert('Incorrect Username or Password')
      }
    }

    onMounted(() => {
      usernameEl.value!.focus()
    })

    const usernameEl = ref<HTMLInputElement | null>(null)

    return () => (
      <div style="width: 100%;">
        <form onSubmit={onSubmit} class="center">
          <dl>
            <dt>Username:</dt>
            <dd>
              <input type="text" name="id" v-model={$.username} ref={usernameEl} />
            </dd>
            <dt>Password:</dt>
            <dd>
              <input type="password" name="password" v-model={$.password} />
            </dd>
          </dl>
          <div class="end-h">
            <input type="submit" value="Login" />
          </div>
        </form>
      </div>
    )
  }
})
