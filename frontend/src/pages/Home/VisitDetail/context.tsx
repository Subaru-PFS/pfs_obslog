import { createContext, useContext, useState, type ReactNode } from 'react'
import type { FitsId } from './FitsHeaderInfo'

interface VisitDetailContextValue {
  /** 選択中のFITS ID（FITSヘッダー表示用） */
  selectedFitsId: FitsId | null
  /** FITS IDを設定 */
  setSelectedFitsId: (id: FitsId | null) => void
}

const VisitDetailContext = createContext<VisitDetailContextValue | null>(null)

interface VisitDetailProviderProps {
  children: ReactNode
}

export function VisitDetailProvider({ children }: VisitDetailProviderProps) {
  const [selectedFitsId, setSelectedFitsId] = useState<FitsId | null>(null)

  return (
    <VisitDetailContext.Provider
      value={{
        selectedFitsId,
        setSelectedFitsId,
      }}
    >
      {children}
    </VisitDetailContext.Provider>
  )
}

export function useVisitDetailContext() {
  const context = useContext(VisitDetailContext)
  if (!context) {
    throw new Error('useVisitDetailContext must be used within a VisitDetailProvider')
  }
  return context
}
