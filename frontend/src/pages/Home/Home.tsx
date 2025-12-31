import { useState, useRef, useCallback, useEffect } from 'react'
import { useGetMeApiAuthMeGetQuery, useLogoutApiAuthLogoutPostMutation } from '../../store/api/generatedApi'
import { HomeProvider } from './context'
import { VisitList } from './VisitList'
import { VisitDetail } from './VisitDetail'
import { Icon } from '../../components/Icon'
import { Tooltip } from '../../components/Tooltip'
import { LoadingOverlay } from '../../components/LoadingOverlay'
import styles from './Home.module.scss'

const DEFAULT_LEFT_PANE_WIDTH = 500
const MIN_LEFT_PANE_WIDTH = 300
const MAX_LEFT_PANE_WIDTH = 1200
const STORAGE_KEY = 'pfs-obslog:home:leftPaneWidth'

function HomeContent() {
  const { data: user } = useGetMeApiAuthMeGetQuery()
  const [logout] = useLogoutApiAuthLogoutPostMutation()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [leftPaneWidth, setLeftPaneWidth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? parseInt(saved, 10) : DEFAULT_LEFT_PANE_WIDTH
  })
  const [isResizing, setIsResizing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const containerRect = containerRef.current.getBoundingClientRect()
      let newWidth = e.clientX - containerRect.left
      newWidth = Math.max(MIN_LEFT_PANE_WIDTH, Math.min(MAX_LEFT_PANE_WIDTH, newWidth))
      setLeftPaneWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      localStorage.setItem(STORAGE_KEY, leftPaneWidth.toString())
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, leftPaneWidth])

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

      <div className={styles.mainContent} ref={containerRef}>
        <div className={styles.leftPane} style={{ width: leftPaneWidth }}>
          <VisitList />
        </div>

        <div 
          className={`${styles.resizer} ${isResizing ? styles.resizerActive : ''}`}
          onMouseDown={handleMouseDown}
        />

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

