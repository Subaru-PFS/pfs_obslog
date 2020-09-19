import { computed, defineComponent, onMounted, reactive, ref } from "vue"
import Center from '/src/components/Center'
import { go } from "/src/router"
import { login } from "/src/session"

export default defineComponent({
  setup() {
    const $ = reactive({
      email: '',
      password: '',
    })

    const ready = computed(() => $.email !== '')

    const submit = async (e: Event) => {
      e.preventDefault()
      try {
        await login($.email, $.password)
        go('/', 'slideLeft')
      }
      catch (e) {
        alert(e)
      }
    }

    onMounted(() => {
      emailInput.value?.focus()
    })

    const emailInput = ref<HTMLInputElement>()

    return () => (
      <Center>{() => (
        <>
          <h1>PFS Obslog</h1>
          <form onSubmit={submit}>
            <dl>
              <dt>E-Mail:</dt>
              <dd><input type="text" v-model={$.email} name="email" ref={emailInput} size={30} /></dd>
              <dt>Password:</dt>
              <dd><input type="password" v-model={$.password} name="password" disabled={true} size={30} /></dd>
            </dl>
            <div class="end-h">
              <input type="submit" value="Login" disabled={!ready.value} />
            </div>
            <div class="end-h">
              <div class="note">Password is not required</div>
            </div>
          </form>
        </>
      )}
      </Center>
    )
  }
})
