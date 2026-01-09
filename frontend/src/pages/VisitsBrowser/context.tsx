import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'

interface VisitsBrowserContextValue {
  /** 選択中のVisit ID */
  selectedVisitId: number | null
  /** Visit IDを選択（URLも更新される） */
  setSelectedVisitId: (id: number | null) => void
  /** 一覧をリフレッシュするためのトリガー */
  refreshKey: number
  /** リフレッシュを実行 */
  refresh: () => void
  /** visitをリスト内に表示するためのコールバック（VisitListから設定） */
  scrollToVisit: ((visitId: number) => void) | null
  /** scrollToVisit コールバックを設定 */
  setScrollToVisitCallback: (callback: ((visitId: number) => void) | null) => void
}

const VisitsBrowserContext = createContext<VisitsBrowserContextValue | null>(null)

interface VisitsBrowserProviderProps {
  children: ReactNode
}

export function VisitsBrowserProvider({ children }: VisitsBrowserProviderProps) {
  const { visitId: visitIdParam } = useParams<{ visitId?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  
  // URLパラメータからvisitIdを初期化
  const initialVisitId = visitIdParam ? parseInt(visitIdParam, 10) : null
  const [selectedVisitId, setSelectedVisitIdState] = useState<number | null>(
    initialVisitId && !isNaN(initialVisitId) ? initialVisitId : null
  )
  const [refreshKey, setRefreshKey] = useState(0)
  const [scrollToVisitCallback, setScrollToVisitCallbackState] = useState<((visitId: number) => void) | null>(null)

  // URLパラメータの変更を監視してstateを更新
  useEffect(() => {
    const newVisitId = visitIdParam ? parseInt(visitIdParam, 10) : null
    if (newVisitId !== selectedVisitId && (newVisitId === null || !isNaN(newVisitId))) {
      setSelectedVisitIdState(newVisitId)
    }
  }, [visitIdParam, selectedVisitId])

  // visitIdを設定すると同時にURLも更新する（検索パラメータを保持）
  const setSelectedVisitId = useCallback((id: number | null) => {
    setSelectedVisitIdState(id)
    // 現在の検索パラメータを保持してナビゲート
    const search = location.search
    if (id !== null) {
      navigate(`/visits/${id}${search}`, { replace: true })
    } else {
      navigate(`/visits${search}`, { replace: true })
    }
  }, [navigate, location.search])

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  const setScrollToVisitCallback = useCallback((callback: ((visitId: number) => void) | null) => {
    setScrollToVisitCallbackState(() => callback)
  }, [])

  return (
    <VisitsBrowserContext.Provider
      value={{
        selectedVisitId,
        setSelectedVisitId,
        refreshKey,
        refresh,
        scrollToVisit: scrollToVisitCallback,
        setScrollToVisitCallback,
      }}
    >
      {children}
    </VisitsBrowserContext.Provider>
  )
}

export function useVisitsBrowserContext() {
  const context = useContext(VisitsBrowserContext)
  if (!context) {
    throw new Error('useVisitsBrowserContext must be used within a VisitsBrowserProvider')
  }
  return context
}
