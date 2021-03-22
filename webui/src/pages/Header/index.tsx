import { useMatch, useNavigate } from "solid-app-router"
import { JSX, Show, splitProps } from "solid-js"
import { IconButton } from "~/components/Icon"
import { useModelLoading } from "~/components/Loading"
import { logout, useSession } from "~/session"
import styles from "./styles.module.scss"


export function Header(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, others] = splitProps(props, ['classList'])
  const navigate = useNavigate()
  const loginActive = useMatch(() => '/login')
  const visitsActive = useMatch(() => '/visits/*')
  const designsActive = useMatch(() => '/designs/*')

  const modalLoading = useModelLoading()
  const onCLickLogout = async () => {
    await modalLoading(logout)
    navigate('/')
  }

  const session = useSession()

  return (
    <div classList={{ [styles.header]: true, ...local.classList }} {...others}>
      <div class={styles.logo}>PFS-OBSLOG</div>
      <Show when={session()}>
        <div class={styles.user}>
          {session()?.current_user?.account_name}
        </div>
      </Show>
      <div style={{ "flex-grow": 1 }} />
      <div class={styles.buttons}>
        <Show when={!loginActive()}>
          <IconButton size={18} icon="camera" onClick={() => navigate('/visits')} disabled={!!visitsActive()} tippy={{ content: 'Visits' }} />
          <IconButton size={18} icon="design_services" onClick={() => navigate('/designs')} disabled={!!designsActive()} tippy={{ content: 'PFS Designs' }} />
          <Show when={import.meta.env.DEV}>
            <IconButton size={18} icon="settings" onClick={() => navigate('/devel')} />
          </Show>
          <IconButton size={18} icon="logout" onClick={onCLickLogout} tippy={{ content: 'Logout' }} />
        </Show>
      </div>
    </div>
  )
}
