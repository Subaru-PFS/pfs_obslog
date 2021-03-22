import { useNavigate } from "solid-app-router"
import { createSignal, onMount } from "solid-js"
import { Center, JustifyEnd } from "~/components/layout"
import { useModelLoading } from "~/components/Loading"
import { InvalidCredentialsError, login } from "~/session"
import styles from './styles.module.scss'

export function Login() {
  const [username, setUsername] = createSignal('')
  const [password, setPassword] = createSignal('')

  let usernameEl: HTMLInputElement | undefined
  onMount(() => {
    usernameEl?.focus()
  })

  const modalLoading = useModelLoading()
  const navigate = useNavigate()
  const onSubmit = async (e: SubmitEvent) => {
    e.preventDefault()
    try {
      await modalLoading(() => login(username(), password()))
      navigate(history.state?.from || '/')
    }
    catch (e) {
      if (e instanceof InvalidCredentialsError) {
        alert('Invalid Username or Password')
      }
    }
  }

  return (
    <Center>
      <form class={styles.form} onSubmit={onSubmit}>
        <dl>
          <dt>STN Account:</dt>
          <dd>
            <input
              type="text" name="username" value={username()} onInput={e => setUsername(e.currentTarget.value)}
              autocomplete="username"
              ref={usernameEl}
            />
          </dd>
          <dt>Password:</dt>
          <dd>
            <input
              type="password" name="password" value={password()} onInput={e => setPassword(e.currentTarget.value)}
              autocomplete="current-password"
            />
          </dd>
        </dl>
        <JustifyEnd>
          <input type="submit" value="Log In" />
        </JustifyEnd>
      </form>
    </Center>
  )
}
