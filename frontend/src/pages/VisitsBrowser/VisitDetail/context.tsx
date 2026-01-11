import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { FitsId } from './FitsHeaderInfo'
import type { VisitDetail } from '../../../store/api/generatedApi'

/** タブ名 */
export type TabName = 'sps' | 'mcs' | 'agc' | 'iic_sequence' | 'sequence_group'

interface VisitDetailContextValue {
  /** 選択中のFITS ID（FITSヘッダー表示用） */
  selectedFitsId: FitsId | null
  /** FITS IDを設定 */
  setSelectedFitsId: (id: FitsId | null) => void
  /** タブに対応する最初のExposureを選択 */
  selectFirstExposure: (visit: VisitDetail, tabName: TabName) => void
}

const VisitDetailContext = createContext<VisitDetailContextValue | null>(null)

interface VisitDetailProviderProps {
  children: ReactNode
}

export function VisitDetailProvider({ children }: VisitDetailProviderProps) {
  const [selectedFitsId, setSelectedFitsId] = useState<FitsId | null>(null)

  const selectFirstExposure = useCallback((visit: VisitDetail, tabName: TabName) => {
    switch (tabName) {
      case 'sps': {
        const firstSps = visit.sps?.exposures?.[0]
        if (firstSps) {
          setSelectedFitsId({ type: 'sps', visitId: visit.id, cameraId: firstSps.camera_id })
        } else {
          setSelectedFitsId(null)
        }
        break
      }
      case 'mcs': {
        const firstMcs = visit.mcs?.exposures?.[0]
        if (firstMcs) {
          setSelectedFitsId({ type: 'mcs', visitId: visit.id, frameId: firstMcs.frame_id })
        } else {
          setSelectedFitsId(null)
        }
        break
      }
      case 'agc': {
        const firstAgc = visit.agc?.exposures?.[0]
        if (firstAgc) {
          setSelectedFitsId({ type: 'agc', visitId: visit.id, exposureId: firstAgc.id })
        } else {
          setSelectedFitsId(null)
        }
        break
      }
      default:
        // IIC Sequence and Sequence Group tabs don't have FITS
        setSelectedFitsId(null)
        break
    }
  }, [])

  return (
    <VisitDetailContext.Provider
      value={{
        selectedFitsId,
        setSelectedFitsId,
        selectFirstExposure,
      }}
    >
      {children}
    </VisitDetailContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- Context hook pattern
export function useVisitDetailContext() {
  const context = useContext(VisitDetailContext)
  if (!context) {
    throw new Error('useVisitDetailContext must be used within a VisitDetailProvider')
  }
  return context
}
