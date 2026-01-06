import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

interface VisitsBrowserContextValue {
  /** 選択中のVisit ID */
  selectedVisitId: number | null
  /** Visit IDを選択（URLも更新される） */
  setSelectedVisitId: (id: number | null) => void
  /** Visit IDを選択（スクロールをスキップ） */
  setSelectedVisitIdWithoutScroll: (id: number | null) => void
  /** スクロールをスキップするかどうかを確認して消費する（一度呼ぶとfalseに戻る） */
  consumeSkipScroll: () => boolean
  /** 一覧をリフレッシュするためのトリガー */
  refreshKey: number
  /** リフレッシュを実行 */
  refresh: () => void
}

const VisitsBrowserContext = createContext<VisitsBrowserContextValue | null>(null)

interface VisitsBrowserProviderProps {
  children: ReactNode
}

export function VisitsBrowserProvider({ children }: VisitsBrowserProviderProps) {
  const { visitId: visitIdParam } = useParams<{ visitId?: string }>()
  const navigate = useNavigate()
  
  // URLパラメータからvisitIdを初期化
  const initialVisitId = visitIdParam ? parseInt(visitIdParam, 10) : null
  const [selectedVisitId, setSelectedVisitIdState] = useState<number | null>(
    initialVisitId && !isNaN(initialVisitId) ? initialVisitId : null
  )
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Ref to track whether to skip scroll on selection change
  const skipScrollRef = useRef(false)

  // URLパラメータの変更を監視してstateを更新
  useEffect(() => {
    const newVisitId = visitIdParam ? parseInt(visitIdParam, 10) : null
    if (newVisitId !== selectedVisitId && (newVisitId === null || !isNaN(newVisitId))) {
      setSelectedVisitIdState(newVisitId)
    }
  }, [visitIdParam, selectedVisitId])

  // visitIdを設定すると同時にURLも更新する
  const setSelectedVisitId = useCallback((id: number | null) => {
    setSelectedVisitIdState(id)
    if (id !== null) {
      navigate(`/visits/${id}`, { replace: true })
    } else {
      navigate('/visits', { replace: true })
    }
  }, [navigate])
  
  // visitIdを設定（スクロールをスキップ）
  const setSelectedVisitIdWithoutScroll = useCallback((id: number | null) => {
    skipScrollRef.current = true
    setSelectedVisitId(id)
  }, [setSelectedVisitId])
  
  // スクロールをスキップするかどうかを確認して消費する
  const consumeSkipScroll = useCallback(() => {
    const shouldSkip = skipScrollRef.current
    skipScrollRef.current = false
    return shouldSkip
  }, [])

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  return (
    <VisitsBrowserContext.Provider
      value={{
        selectedVisitId,
        setSelectedVisitId,
        setSelectedVisitIdWithoutScroll,
        consumeSkipScroll,
        refreshKey,
        refresh,
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
