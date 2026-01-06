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
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { dateUtils, angle } from '@stellar-globe/stellar-globe'
import {
  useListPfsDesignsApiPfsDesignsGetQuery,
  useListDesignPositionsApiPfsDesignsPositionsGetQuery,
  useGetDesignApiPfsDesignsIdHexGetQuery,
  useGetDesignRankApiPfsDesignsRankDesignIdGetQuery,
} from '../../store/api/generatedApi'
import type { PfsDesignEntry, PfsDesignDetail, PfsDesignPosition } from './types'
import { SUBARU_TELESCOPE_LOCATION, HST_TZ_OFFSET } from './types'

/**
 * 天頂の赤道座標を計算（度単位で返す）
 * stellar-globeのdateUtils.zenithSkyCoordを使用
 */
function calculateZenithSkyCoord(
  date: Date,
  location: { lat: number; lon: number }
): { ra: number; dec: number } {
  const { za, zd } = dateUtils.zenithSkyCoord({ when: date, where: location })
  return {
    ra: angle.rad2deg(za),
    dec: angle.rad2deg(zd),
  }
}

/**
 * 天頂座標をラジアンで計算（za, zd, zpを返す）
 * カメラやグリッドの天頂パラメータに使用
 */
function calculateZenithZaZd(
  date: Date,
  location: { lat: number; lon: number }
): { za: number; zd: number; zp: number } {
  return dateUtils.zenithSkyCoord({ when: date, where: location })
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

// フォーカスされたファイバーの情報
export type FocusedFiber = {
  fiberId: number  // FiberId (design_data.fiberId配列内の値)
  source: 'skyViewer' | 'focalPlane'  // どこからフォーカスされたか
}

// ソートオプション
export type SortBy = 'date_modified' | 'name' | 'id' | 'altitude'
export type SortOrder = 'asc' | 'desc'

interface DesignsContextValue {
  // Design一覧（ページネーション）
  designs: PfsDesignEntry[]
  total: number
  isLoading: boolean
  isFetching: boolean  // データ再取得中フラグ（ローディングオーバーレイ用）
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
  // 日付フィルター
  dateRange: [string | null, string | null]
  setDateRange: (range: [string | null, string | null]) => void

  // 全Design位置情報（SkyViewer用）
  allPositions: PfsDesignPosition[]
  isLoadingPositions: boolean

  // 選択・フォーカス
  selectedDesign: PfsDesignEntry | undefined
  setSelectedDesign: (design: PfsDesignEntry | undefined) => void
  focusedDesign: PfsDesignEntry | undefined
  setFocusedDesign: (design: PfsDesignEntry | undefined) => void

  // ファイバーフォーカス（SkyViewerとFocalPlane間の連携）
  focusedFiber: FocusedFiber | undefined
  setFocusedFiber: (fiber: FocusedFiber | undefined) => void

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
  // 天頂座標（ラジアン）- AltAzグリッド用、カメラの天頂パラメータ用
  zenithZaZd: { za: number; zd: number; zp: number }
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
  const [searchParams, setSearchParams] = useSearchParams()

  // URLパラメータから初期値を取得
  const urlSearch = searchParams.get('search') ?? ''
  const urlSortBy = (searchParams.get('sortBy') as SortBy) || 'altitude'
  const urlSortOrder = (searchParams.get('sortOrder') as SortOrder) || 'desc'
  const urlDateFrom = searchParams.get('dateFrom')
  const urlDateTo = searchParams.get('dateTo')

  // 時刻・位置（APIクエリより先に定義）
  const [now, setNow] = useState(() => new Date())
  const telescopeLocation = SUBARU_TELESCOPE_LOCATION
  const [isDraggingClock, setDraggingClock] = useState(false)

  // HST時刻
  const hst = useMemo(() => inTimeZone(now, HST_TZ_OFFSET), [now])

  // 天頂座標（度）- 表示用（リアルタイム更新）
  const zenithSkyCoord = useMemo(
    () => calculateZenithSkyCoord(now, telescopeLocation),
    [now, telescopeLocation]
  )

  // 確定された天頂座標（APIクエリ用）- ドラッグ中は更新しない
  const [committedZenith, setCommittedZenith] = useState(() =>
    calculateZenithSkyCoord(new Date(), telescopeLocation)
  )

  // ドラッグ終了時に確定座標を更新
  useEffect(() => {
    if (!isDraggingClock) {
      setCommittedZenith(zenithSkyCoord)
    }
  }, [isDraggingClock, zenithSkyCoord])

  // 天頂座標（ラジアン）- AltAzグリッド用、カメラの天頂パラメータ用
  // stellar-globeのdateUtils.zenithSkyCoordを直接使用
  const zenithZaZd = useMemo(
    () => calculateZenithZaZd(now, telescopeLocation),
    [now, telescopeLocation]
  )

  // ページネーション状態
  const [offset, setOffset] = useState(0)
  const [limit, setLimit] = useState(50)

  // 検索・ソート状態（URLパラメータから初期化）
  const [search, setSearchState] = useState(urlSearch)
  const [sortBy, setSortByState] = useState<SortBy>(urlSortBy)
  const [sortOrder, setSortOrderState] = useState<SortOrder>(urlSortOrder)
  // 日付フィルター [YYYY-MM-DD, YYYY-MM-DD] or [null, null]
  const [dateRange, setDateRangeState] = useState<[string | null, string | null]>([
    urlDateFrom,
    urlDateTo,
  ])

  // URLパラメータ更新ヘルパー（replaceで履歴を汚さない）
  const updateSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(updates)) {
            if (value === null || value === '') {
              next.delete(key)
            } else {
              next.set(key, value)
            }
          }
          return next
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  // 状態設定関数（URLも更新）
  const setSearch = useCallback(
    (value: string) => {
      setSearchState(value)
      setOffset(0) // 検索変更時はページをリセット
      updateSearchParams({ search: value || null })
    },
    [updateSearchParams]
  )

  const setSortBy = useCallback(
    (value: SortBy) => {
      setSortByState(value)
      setOffset(0) // ソート変更時はページをリセット
      updateSearchParams({ sortBy: value === 'altitude' ? null : value })
    },
    [updateSearchParams]
  )

  const setSortOrder = useCallback(
    (value: SortOrder) => {
      setSortOrderState(value)
      setOffset(0) // ソート変更時はページをリセット
      updateSearchParams({ sortOrder: value === 'desc' ? null : value })
    },
    [updateSearchParams]
  )

  const setDateRange = useCallback(
    (value: [string | null, string | null]) => {
      setDateRangeState(value)
      setOffset(0) // 日付変更時はページをリセット
      updateSearchParams({
        dateFrom: value[0],
        dateTo: value[1],
      })
    },
    [updateSearchParams]
  )

  // 高度ソート時に天頂座標が変わったらページをリセット
  const prevCommittedZenithRef = useRef(committedZenith)
  useEffect(() => {
    if (
      sortBy === 'altitude' &&
      (prevCommittedZenithRef.current.ra !== committedZenith.ra ||
        prevCommittedZenithRef.current.dec !== committedZenith.dec)
    ) {
      setOffset(0)
    }
    prevCommittedZenithRef.current = committedZenith
  }, [sortBy, committedZenith])

  // Design一覧取得（ページネーション付き）
  // sortBy が 'altitude' の場合は確定された天頂座標を渡す
  const {
    data: listResponse,
    isLoading,
    isFetching,
    refetch,
  } = useListPfsDesignsApiPfsDesignsGetQuery({
    search: search || undefined,
    sortBy,
    sortOrder,
    offset,
    limit,
    zenithRa: sortBy === 'altitude' ? committedZenith.ra : undefined,
    zenithDec: sortBy === 'altitude' ? committedZenith.dec : undefined,
    dateFrom: dateRange[0] || undefined,
    dateTo: dateRange[1] || undefined,
  })

  const designs = listResponse?.items ?? []
  const total = listResponse?.total ?? 0

  // Design位置情報取得（SkyViewer用）- 検索条件と日付フィルターを反映
  const {
    data: allPositions = [],
    isLoading: isLoadingPositions,
  } = useListDesignPositionsApiPfsDesignsPositionsGetQuery({
    search: search || undefined,
    dateFrom: dateRange[0] || undefined,
    dateTo: dateRange[1] || undefined,
  })

  // 選択・フォーカス状態
  const [selectedDesign, setSelectedDesignState] = useState<
    PfsDesignEntry | undefined
  >()
  const [focusedDesign, setFocusedDesignState] = useState<
    PfsDesignEntry | undefined
  >()
  const [focusedFiber, setFocusedFiberState] = useState<
    FocusedFiber | undefined
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

  // ファイバーフォーカス状態の設定
  const setFocusedFiber = useCallback(
    (fiber: FocusedFiber | undefined) => {
      setFocusedFiberState((prev) => {
        if (prev?.fiberId === fiber?.fiberId && prev?.source === fiber?.source) {
          return prev // 同じなら更新しない
        }
        return fiber
      })
    },
    []
  )

  // 天球ビュー制御
  const [jumpToSignal, setJumpToSignal] = useState<JumpToOptions | null>(null)
  const [showFibers, setShowFibers] = useState(true)

  // Design詳細取得
  // selectedDesign がある場合はその ID を使う
  // ない場合でも URL パラメータの designId があればそれを使う（初回ロード時）
  const designIdForDetail = selectedDesign?.id ?? designId ?? ''
  const { data: designDetail, isLoading: isLoadingDetail } =
    useGetDesignApiPfsDesignsIdHexGetQuery(
      { idHex: designIdForDetail },
      { skip: !designIdForDetail }
    )

  // 選択されたDesignがリスト内にあるか確認
  const isSelectedDesignInList = useMemo(
    () => selectedDesign && designs.some((d) => d.id === selectedDesign.id),
    [selectedDesign, designs]
  )

  // 選択されたDesignのランクを取得（リスト内にない場合のみ）
  const { data: rankData } = useGetDesignRankApiPfsDesignsRankDesignIdGetQuery(
    {
      designId: selectedDesign?.id ?? '',
      search: search || undefined,
      sortBy,
      sortOrder,
      zenithRa: sortBy === 'altitude' ? committedZenith.ra : undefined,
      zenithDec: sortBy === 'altitude' ? committedZenith.dec : undefined,
      dateFrom: dateRange[0] || undefined,
      dateTo: dateRange[1] || undefined,
    },
    { skip: !selectedDesign || isSelectedDesignInList }
  )

  // ランクが取得できたらページ遷移（リスト内にないDesignが選択された時）
  useEffect(() => {
    if (rankData?.rank != null && !isSelectedDesignInList) {
      const targetOffset = Math.floor(rankData.rank / limit) * limit
      if (targetOffset !== offset) {
        setOffset(targetOffset)
      }
    }
  }, [rankData, isSelectedDesignInList, limit, offset, setOffset])

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
        // 初期ジャンプ（位置情報から）- Design視野(~1.4度)より少し広めに
        jumpTo({
          fovy: (1.6 * Math.PI) / 180,
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
    isFetching,
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
    dateRange,
    setDateRange,
    allPositions,
    isLoadingPositions,
    selectedDesign,
    setSelectedDesign,
    focusedDesign,
    setFocusedDesign,
    focusedFiber,
    setFocusedFiber,
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
