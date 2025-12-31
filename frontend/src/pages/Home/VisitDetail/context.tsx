import { createContext, useContext, useState, type ReactNode } from 'react'

export type FitsIdType = 'sps' | 'mcs' | 'agc'

export interface FitsId {
  visitId: number
  type: FitsIdType
  fitsId: number // camera_id for SPS, frame_id for MCS, exposure_id for AGC
}

interface VisitDetailContextValue {
  /** 現在選択されているFITS ID（ヘッダー表示用） */
  fitsId: FitsId | null
  /** FITS IDを設定 */
  setFitsId: (id: FitsId | null) => void
}

const VisitDetailContext = createContext<VisitDetailContextValue | null>(null)

interface VisitDetailProviderProps {
  children: ReactNode
}

export function VisitDetailProvider({ children }: VisitDetailProviderProps) {
  const [fitsId, setFitsId] = useState<FitsId | null>(null)

  return (
    <VisitDetailContext.Provider value={{ fitsId, setFitsId }}>
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
