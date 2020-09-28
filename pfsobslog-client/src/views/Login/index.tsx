import { computed, defineComponent, onMounted, reactive, ref } from "vue"
import Center from '/src/components/Center'
import { go } from "/src/router"
import { login } from "/src/session"
import { vModel } from "/src/utils/vModel"


export default defineComponent({
  setup($p, { emit }) {
    const $ = reactive({
      email: '',
      password: '',
    })

    const ready = computed(() => $.email !== '')

    const submit = async (e: Event) => {
      e.preventDefault()
      try {
        await login($.email, $.password)
        $.email = ''
        $.password = ''
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
          <h1>PFS obslog</h1>
          <form onSubmit={submit}>
            <dl>
              <dt>E-Mail:</dt>
              <dd><input type="text" {...vModel($.email, _ => $.email = _)} name="email" ref={emailInput} size={30} /></dd>
              <dt>Password:</dt>
              <dd><input type="password" {...vModel($.password, _ => $.password = _)} name="password" disabled={true} size={30} /></dd>
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
