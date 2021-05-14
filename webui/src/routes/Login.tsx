import { defineComponent, reactive } from "@vue/runtime-core"
import { ref } from "vue"
import { sessionLogin } from "~/session"
import { router } from "../router"


export default defineComponent({
  setup() {
    const $ = reactive({
      username: '',
      password: '',
    })

    const onSubmit = async (ev: Event) => {
      ev.preventDefault()
      const { username, password } = $
      if (await sessionLogin(username, password)) {
        router.push('/')
      }
      else {
        alert('Incorrect Username or Password')
      }
    }

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
