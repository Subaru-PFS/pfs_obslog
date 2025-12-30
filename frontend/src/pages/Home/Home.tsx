import { useGetMeApiAuthMeGetQuery, useLogoutApiAuthLogoutPostMutation } from '../../store/api/generatedApi'
import { HomeProvider, useHomeContext } from './context'
import { VisitList } from './VisitList'
import styles from './Home.module.scss'

function HomeContent() {
  const { selectedVisitId } = useHomeContext()
  const { data: user } = useGetMeApiAuthMeGetQuery()
  const [logout] = useLogoutApiAuthLogoutPostMutation()

  const handleLogout = async () => {
    await logout()
    window.location.reload()
  }

  return (
    <div className={styles.home}>
      <header className={styles.header}>
        <h1>PFS Obslog</h1>
        <div className={styles.userInfo}>
          {user && <span className={styles.username}>{user.user_id}</span>}
          <button className={styles.logoutButton} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className={styles.mainContent}>
        <div className={styles.leftPane}>
          <VisitList />
        </div>

        <div className={styles.resizer} />

        <div className={styles.rightPane}>
          {selectedVisitId ? (
            <div className={styles.placeholder}>
              Visit #{selectedVisitId} の詳細（未実装）
            </div>
          ) : (
            <div className={styles.placeholder}>
              左のリストからVisitを選択してください
            </div>
          )}
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
