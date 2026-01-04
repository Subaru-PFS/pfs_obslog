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
  useRef,
  type ReactNode,
} from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  useListPfsDesignsApiPfsDesignsGetQuery,
  useListDesignPositionsApiPfsDesignsPositionsGetQuery,
  useGetDesignApiPfsDesignsIdHexGetQuery,
} from '../../store/api/generatedApi'
import type { PfsDesignEntry, PfsDesignDetail, PfsDesignPosition } from './types'
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
  // 天頂パラメータ（ラジアン）- AltAzグリッドの中心を設定
  za?: number
  zd?: number
  zp?: number
}

// ソートオプション
export type SortBy = 'date_modified' | 'name' | 'id'
export type SortOrder = 'asc' | 'desc'

interface DesignsContextValue {
  // Design一覧（ページネーション）
  designs: PfsDesignEntry[]
  total: number
  isLoading: boolean
  refetch: () => void

  // ページネーション状態
  offset: number
  setOffset: (offset: number) => void
  limit: number
  setLimit: (limit: number) => void

  // 検索・ソート（サーバーサイド）
  search: string
  setSearch: (search: string) => void
  sortBy: SortBy
  setSortBy: (sortBy: SortBy) => void
  sortOrder: SortOrder
  setSortOrder: (sortOrder: SortOrder) => void

  // 全Design位置情報（SkyViewer用）
  allPositions: PfsDesignPosition[]
  isLoadingPositions: boolean

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
  // 天頂座標（ラジアン）- AltAzグリッド用
  zenithZaZd: { za: number; zd: number }
  // 時計ドラッグ中フラグ（高度ソート更新抑制用）
  isDraggingClock: boolean
  setDraggingClock: (dragging: boolean) => void
}

const DesignsContext = createContext<DesignsContextValue | null>(null)

interface DesignsProviderProps {
  children: ReactNode
}

export function DesignsProvider({ children }: DesignsProviderProps) {
  const navigate = useNavigate()
  const { designId } = useParams<{ designId?: string }>()

  // ページネーション状態
  const [offset, setOffset] = useState(0)
  const [limit, setLimit] = useState(50)

  // 検索・ソート状態（サーバーサイド）
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('date_modified')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Design一覧取得（ページネーション付き）
  const {
    data: listResponse,
    isLoading,
    refetch,
  } = useListPfsDesignsApiPfsDesignsGetQuery({
    search: search || undefined,
    sortBy,
    sortOrder,
    offset,
    limit,
  })

  const designs = listResponse?.items ?? []
  const total = listResponse?.total ?? 0

  // 全Design位置情報取得（SkyViewer用）
  const {
    data: allPositions = [],
    isLoading: isLoadingPositions,
  } = useListDesignPositionsApiPfsDesignsPositionsGetQuery()

  // 選択・フォーカス状態
  const [selectedDesign, setSelectedDesignState] = useState<
    PfsDesignEntry | undefined
  >()
  const [focusedDesign, setFocusedDesignState] = useState<
    PfsDesignEntry | undefined
  >()

  // フォーカス状態の設定（同じIDなら更新をスキップして不要な再レンダリングを防ぐ）
  const setFocusedDesign = useCallback(
    (design: PfsDesignEntry | undefined) => {
      setFocusedDesignState((prev) => {
        if (prev?.id === design?.id) {
          return prev // 同じIDなら更新しない
        }
        return design
      })
    },
    []
  )

  // 天球ビュー制御
  const [jumpToSignal, setJumpToSignal] = useState<JumpToOptions | null>(null)
  const [showFibers, setShowFibers] = useState(true)

  // 時刻・位置
  const [now, setNow] = useState(() => new Date())
  const telescopeLocation = SUBARU_TELESCOPE_LOCATION
  const [isDraggingClock, setDraggingClock] = useState(false)

  // HST時刻
  const hst = useMemo(() => inTimeZone(now, HST_TZ_OFFSET), [now])

  // 天頂座標（度）
  const zenithSkyCoord = useMemo(
    () => calculateZenithSkyCoord(now, telescopeLocation),
    [now, telescopeLocation]
  )

  // 天頂座標（ラジアン）- AltAzグリッド用
  const zenithZaZd = useMemo(() => {
    const { ra, dec } = zenithSkyCoord
    return {
      za: (ra * Math.PI) / 180,
      zd: (dec * Math.PI) / 180,
    }
  }, [zenithSkyCoord])

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

  // 初期ジャンプが完了したかを追跡
  const initialJumpDoneRef = useRef(false)

  // URL paramsからDesignを選択（初回ロード時のみ）
  useEffect(() => {
    // 初期ジャンプが既に行われている場合はスキップ
    if (initialJumpDoneRef.current) {
      return
    }

    if (designId && allPositions.length > 0) {
      // 位置情報からDesignを検索
      const position = allPositions.find((p) => p.id === designId)
      if (position) {
        // 一覧にあればそれを選択
        const design = designs.find((d) => d.id === designId)
        if (design) {
          setSelectedDesignState(design)
        }
        // 初期ジャンプ（位置情報から）
        jumpTo({
          fovy: (0.8 * Math.PI) / 180,
          coord: { ra: position.ra, dec: position.dec },
          duration: 0,
        })
        // 初期ジャンプ完了をマーク
        initialJumpDoneRef.current = true
      }
    }
  }, [designId, allPositions, designs, jumpTo])

  const value: DesignsContextValue = {
    designs,
    total,
    isLoading,
    refetch,
    offset,
    setOffset,
    limit,
    setLimit,
    search,
    setSearch,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    allPositions,
    isLoadingPositions,
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
    zenithZaZd,
    isDraggingClock,
    setDraggingClock,
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
