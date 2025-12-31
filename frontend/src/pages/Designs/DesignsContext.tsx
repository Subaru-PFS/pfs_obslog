/**
 * Designs Context - 状態管理
 */
import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  useListPfsDesignsApiPfsDesignsGetQuery,
  useGetDesignApiPfsDesignsIdHexGetQuery,
} from '../../store/api/generatedApi'
import type { PfsDesignEntry, PfsDesignDetail } from './types'
import { SUBARU_TELESCOPE_LOCATION, HST_TZ_OFFSET } from './types'

/**
 * 天頂の赤道座標を計算
 */
function calculateZenithSkyCoord(
  date: Date,
  location: { lat: number; lon: number }
): { ra: number; dec: number } {
  // GMST（グリニッジ平均恒星時）を計算
  const jd =
    date.getTime() / 86400000 + 2440587.5 // Unix時間をユリウス日に変換
  const T = (jd - 2451545.0) / 36525 // J2000.0からの経過世紀数
  const gmst =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000

  // 地方恒星時（LST）
  const lst = ((gmst + location.lon) % 360 + 360) % 360

  return {
    ra: lst,
    dec: location.lat,
  }
}

/**
 * タイムゾーン変換
 */
export function inTimeZone(d: Date, tzOffset: number, sign = 1): Date {
  const result = new Date(d)
  const offset = sign * (result.getTimezoneOffset() - tzOffset)
  result.setMinutes(result.getMinutes() + offset)
  return result
}

// カメラジャンプオプション
export type JumpToOptions = {
  fovy?: number
  coord?: { ra: number; dec: number }
  duration?: number
}

interface DesignsContextValue {
  // Design一覧
  designs: PfsDesignEntry[]
  isLoading: boolean
  refetch: () => void

  // 選択・フォーカス
  selectedDesign: PfsDesignEntry | undefined
  setSelectedDesign: (design: PfsDesignEntry | undefined) => void
  focusedDesign: PfsDesignEntry | undefined
  setFocusedDesign: (design: PfsDesignEntry | undefined) => void

  // Design詳細
  designDetail: PfsDesignDetail | undefined
  isLoadingDetail: boolean

  // 天球ビュー制御
  jumpToSignal: JumpToOptions | null
  jumpTo: (options: JumpToOptions) => void
  showFibers: boolean
  setShowFibers: (show: boolean) => void

  // 時刻・位置
  now: Date
  setNow: (date: Date | ((prev: Date) => Date)) => void
  hst: Date
  telescopeLocation: { lat: number; lon: number }
  zenithSkyCoord: { ra: number; dec: number }
}

const DesignsContext = createContext<DesignsContextValue | null>(null)

interface DesignsProviderProps {
  children: ReactNode
}

export function DesignsProvider({ children }: DesignsProviderProps) {
  const navigate = useNavigate()
  const { designId } = useParams<{ designId?: string }>()

  // Design一覧取得
  const {
    data: designs = [],
    isLoading,
    refetch,
  } = useListPfsDesignsApiPfsDesignsGetQuery()

  // 選択・フォーカス状態
  const [selectedDesign, setSelectedDesignState] = useState<
    PfsDesignEntry | undefined
  >()
  const [focusedDesign, setFocusedDesign] = useState<
    PfsDesignEntry | undefined
  >()

  // 天球ビュー制御
  const [jumpToSignal, setJumpToSignal] = useState<JumpToOptions | null>(null)
  const [showFibers, setShowFibers] = useState(true)

  // 時刻・位置
  const [now, setNow] = useState(() => new Date())
  const telescopeLocation = SUBARU_TELESCOPE_LOCATION

  // HST時刻
  const hst = useMemo(() => inTimeZone(now, HST_TZ_OFFSET), [now])

  // 天頂座標
  const zenithSkyCoord = useMemo(
    () => calculateZenithSkyCoord(now, telescopeLocation),
    [now, telescopeLocation]
  )

  // Design詳細取得
  const { data: designDetail, isLoading: isLoadingDetail } =
    useGetDesignApiPfsDesignsIdHexGetQuery(
      { idHex: selectedDesign?.id ?? '' },
      { skip: !selectedDesign }
    )

  // カメラジャンプ
  const jumpTo = useCallback((options: JumpToOptions) => {
    setJumpToSignal(options)
  }, [])

  // 選択状態の設定とURL更新
  const setSelectedDesign = useCallback(
    (design: PfsDesignEntry | undefined) => {
      setSelectedDesignState(design)
      navigate(`/designs${design ? `/${design.id}` : ''}`, { replace: true })
    },
    [navigate]
  )

  // URL paramsからDesignを選択
  useEffect(() => {
    if (designId && designs.length > 0) {
      const design = designs.find((d) => d.id === designId)
      if (design) {
        setSelectedDesignState(design)
        // 初期ジャンプ
        jumpTo({
          fovy: (0.8 * Math.PI) / 180,
          coord: { ra: design.ra, dec: design.dec },
          duration: 0,
        })
      }
    }
  }, [designId, designs, jumpTo])

  const value: DesignsContextValue = {
    designs,
    isLoading,
    refetch,
    selectedDesign,
    setSelectedDesign,
    focusedDesign,
    setFocusedDesign,
    designDetail,
    isLoadingDetail,
    jumpToSignal,
    jumpTo,
    showFibers,
    setShowFibers,
    now,
    setNow,
    hst,
    telescopeLocation,
    zenithSkyCoord,
  }

  return (
    <DesignsContext.Provider value={value}>{children}</DesignsContext.Provider>
  )
}

export function useDesignsContext(): DesignsContextValue {
  const context = useContext(DesignsContext)
  if (!context) {
    throw new Error('useDesignsContext must be used within DesignsProvider')
  }
  return context
}
