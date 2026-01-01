import { useState, useRef, useCallback, useEffect } from 'react'
import { useLocalStorage } from 'react-use'
import { HomeProvider } from './context'
import { VisitList } from './VisitList'
import { VisitDetail } from './VisitDetail'
import styles from './Home.module.scss'

const DEFAULT_LEFT_PANE_WIDTH = 500
const MIN_LEFT_PANE_WIDTH = 300
const MAX_LEFT_PANE_WIDTH = 1200
const STORAGE_KEY = 'pfs-obslog:home:leftPaneWidth'

function HomeContent() {
  const [storedWidth, setStoredWidth] = useLocalStorage(STORAGE_KEY, DEFAULT_LEFT_PANE_WIDTH)
  const [leftPaneWidth, setLeftPaneWidth] = useState(storedWidth ?? DEFAULT_LEFT_PANE_WIDTH)
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
      setStoredWidth(leftPaneWidth)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, leftPaneWidth, setStoredWidth])

  return (
    <div className={styles.home} ref={containerRef}>
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
  )
}

export function Home() {
  return (
    <HomeProvider>
      <HomeContent />
    </HomeProvider>
  )
}

