import { useState } from 'react'
import { useGetMeApiAuthMeGetQuery, useLogoutApiAuthLogoutPostMutation } from '../../store/api/generatedApi'
import { HomeProvider } from './context'
import { VisitList } from './VisitList'
import { VisitDetail } from './VisitDetail'
import { Icon } from '../../components/Icon'
import { Tooltip } from '../../components/Tooltip'
import { LoadingOverlay } from '../../components/LoadingOverlay'
import styles from './Home.module.scss'

function HomeContent() {
  const { data: user } = useGetMeApiAuthMeGetQuery()
  const [logout] = useLogoutApiAuthLogoutPostMutation()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await logout()
    window.location.reload()
  }

  return (
    <div className={styles.home}>
      <LoadingOverlay isLoading={isLoggingOut} fullScreen />
      <header className={styles.header}>
        <h1>PFS Obslog</h1>
        <div className={styles.userInfo}>
          {user && <span className={styles.username}>{user.user_id}</span>}
          <Tooltip content="Logout">
            <button className={styles.logoutButton} onClick={handleLogout}>
              <Icon name="logout" size={18} />
            </button>
          </Tooltip>
        </div>
      </header>

      <div className={styles.mainContent}>
        <div className={styles.leftPane}>
          <VisitList />
        </div>

        <div className={styles.resizer} />

        <div className={styles.rightPane}>
          <VisitDetail />
        </div>
      </div>
    </div>
  )
}

export function Home() {
  return (
    <HomeProvider>
      <HomeContent />
    </HomeProvider>
  )
}

