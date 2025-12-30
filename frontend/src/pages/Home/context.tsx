import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface HomeContextValue {
  /** 選択中のVisit ID */
  selectedVisitId: number | null
  /** Visit IDを選択 */
  setSelectedVisitId: (id: number | null) => void
  /** 一覧をリフレッシュするためのトリガー */
  refreshKey: number
  /** リフレッシュを実行 */
  refresh: () => void
}

const HomeContext = createContext<HomeContextValue | null>(null)

interface HomeProviderProps {
  children: ReactNode
}

export function HomeProvider({ children }: HomeProviderProps) {
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  return (
    <HomeContext.Provider
      value={{
        selectedVisitId,
        setSelectedVisitId,
        refreshKey,
        refresh,
      }}
    >
      {children}
    </HomeContext.Provider>
  )
}

export function useHomeContext() {
  const context = useContext(HomeContext)
  if (!context) {
    throw new Error('useHomeContext must be used within a HomeProvider')
  }
  return context
}
