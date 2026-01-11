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
} from '../../store/api/generatedApi'
import { API_BASE_URL } from '../../config'
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
// eslint-disable-next-line react-refresh/only-export-components -- utility function
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
export type SortBy = 'date_modified' | 'name' | 'id' | 'altitude' | 'distance'
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
  // 明示的にDesignを選択してカメラ移動とスクロールを行う（リスト外のDesignも対応）
  selectDesignAndJump: (designId: string, options?: { animate?: boolean; skipCameraJump?: boolean }) => Promise<void>
  focusedDesign: PfsDesignEntry | undefined
  setFocusedDesign: (design: PfsDesignEntry | undefined) => void

  // ファイバーフォーカス（SkyViewerとFocalPlane間の連携）
  focusedFiber: FocusedFiber | undefined
  setFocusedFiber: (fiber: FocusedFiber | undefined) => void

  // Design詳細
  designDetail: PfsDesignDetail | undefined
  isLoadingDetail: boolean

  // 天球ビュー制御
  // jumpTo: SkyViewerが登録する関数。Globeが初期化されるまではno-op
  jumpTo: (options: JumpToOptions) => void
  registerJumpTo: (fn: (options: JumpToOptions) => void) => void
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

  // カメラ中心座標（distanceソート用）
  cameraCenter: { ra: number; dec: number } | null
  setCameraCenter: (center: { ra: number; dec: number } | null) => void

  // スクロール要求（DesignListで処理される）
  scrollToDesignId: string | null
  setScrollToDesignId: (id: string | null) => void
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

  // カメラ中心座標（distanceソート用）
  const [cameraCenter, setCameraCenterState] = useState<{ ra: number; dec: number } | null>(null)
  const setCameraCenter = useCallback((center: { ra: number; dec: number } | null) => {
    setCameraCenterState(center)
  }, [])

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

  // distanceソート時にカメラ中心座標が変わったらページをリセット
  const prevCameraCenterRef = useRef(cameraCenter)
  useEffect(() => {
    if (
      sortBy === 'distance' &&
      cameraCenter &&
      (prevCameraCenterRef.current?.ra !== cameraCenter.ra ||
        prevCameraCenterRef.current?.dec !== cameraCenter.dec)
    ) {
      setOffset(0)
    }
    prevCameraCenterRef.current = cameraCenter
  }, [sortBy, cameraCenter])

  // Design一覧取得（ページネーション付き）
  // sortBy が 'altitude' の場合は確定された天頂座標を渡す
  // sortBy が 'distance' の場合はカメラ中心座標を渡す（距離ソートとして処理）
  const getZenithCoords = () => {
    if (sortBy === 'altitude') {
      return { zenithRa: committedZenith.ra, zenithDec: committedZenith.dec }
    }
    if (sortBy === 'distance' && cameraCenter) {
      return { zenithRa: cameraCenter.ra, zenithDec: cameraCenter.dec }
    }
    return { zenithRa: undefined, zenithDec: undefined }
  }
  const zenithCoords = getZenithCoords()
  
  const {
    data: listResponse,
    isLoading,
    isFetching,
    refetch,
  } = useListPfsDesignsApiPfsDesignsGetQuery({
    search: search || undefined,
    // distanceソートはAPIではaltitudeソートとして扱う（同じ処理: 指定座標からの距離でソート）
    sortBy: sortBy === 'distance' ? 'altitude' : sortBy,
    sortOrder,
    offset,
    limit,
    zenithRa: zenithCoords.zenithRa,
    zenithDec: zenithCoords.zenithDec,
    dateFrom: dateRange[0] || undefined,
    dateTo: dateRange[1] || undefined,
  })

  // eslint-disable-next-line react-hooks/exhaustive-deps -- designs is from RTK Query and stable per fetch
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
  // jumpToRef: SkyViewerが登録する関数への参照
  const jumpToRef = useRef<(options: JumpToOptions) => void>(() => {
    // Globeが初期化されるまでは何もしない
  })
  // jumpTo: 外部から呼び出す関数（常に最新のjumpToRefを使用）
  const jumpTo = useCallback((options: JumpToOptions) => {
    jumpToRef.current(options)
  }, [])
  // registerJumpTo: SkyViewerがGlobe初期化後に呼び出す
  const registerJumpTo = useCallback((fn: (options: JumpToOptions) => void) => {
    jumpToRef.current = fn
  }, [])
  const [showFibers, setShowFibers] = useState(true)

  // Design詳細取得
  // selectedDesign がある場合はその ID を使う
  // ない場合でも URL パラメータの designId があればそれを使う（初回ロード時）
  const designIdForDetail = selectedDesign?.id ?? designId ?? ''
  const { data: designDetail, isFetching: isLoadingDetail } =
    useGetDesignApiPfsDesignsIdHexGetQuery(
      { idHex: designIdForDetail },
      { skip: !designIdForDetail }
    )

  // 選択状態の設定とURL更新
  const setSelectedDesign = useCallback(
    (design: PfsDesignEntry | undefined) => {
      setSelectedDesignState(design)
      navigate(`/designs${design ? `/${design.id}` : ''}`, { replace: true })
    },
    [navigate]
  )

  // スクロール要求用のstate（DesignListで処理される）
  const [scrollToDesignId, setScrollToDesignId] = useState<string | null>(null)
  
  // 明示的にDesignを選択してカメラ移動とスクロールを行う
  // リスト外のDesignの場合はランクを取得してページ遷移する
  const selectDesignAndJump = useCallback(
    async (designIdToSelect: string, options?: { animate?: boolean; skipCameraJump?: boolean }) => {
      // 位置情報からDesignを検索
      let position = allPositions.find((p) => p.id === designIdToSelect)
      
      // allPositionsに含まれていない場合（検索条件でフィルターアウトされた等）
      // designDetailから座標を取得する（designDetailが同じIDの場合）
      if (!position && designDetail && designIdToSelect === (selectedDesign?.id ?? designId)) {
        // designDetailのfits_metaからRA/DECを取得
        const header0 = designDetail.fits_meta.hdul[0]?.header
        const raCard = header0?.cards.find((c) => c.key === 'RA')
        const decCard = header0?.cards.find((c) => c.key === 'DEC')
        if (raCard?.value != null && decCard?.value != null) {
          position = {
            id: designIdToSelect,
            ra: Number(raCard.value),
            dec: Number(decCard.value),
          }
        }
      }
      
      if (!position) {
        // 位置情報がなければ何もしない（designDetailもまだロード中等）
        return
      }

      // リスト内にあるか確認
      const designInList = designs.find((d) => d.id === designIdToSelect)
      
      if (designInList) {
        // リスト内にある場合: 選択状態を設定し、カメラ移動とスクロールを行う
        setSelectedDesignState(designInList)
        navigate(`/designs/${designInList.id}`, { replace: true })
        
        // カメラ移動（skipCameraJumpが指定されている場合はスキップ）
        if (!options?.skipCameraJump) {
          jumpToRef.current({
            fovy: (1.6 * Math.PI) / 180,
            coord: { ra: position.ra, dec: position.dec },
            duration: options?.animate ? 1000 : 0,
          })
        }
        
        // スクロール要求を設定（DesignListで処理される）
        setScrollToDesignId(designIdToSelect)
      } else {
        // リスト外の場合: カメラ移動を先に開始し、ランク取得を並行して行う
        
        // カメラ移動を先に開始（skipCameraJumpが指定されている場合はスキップ）
        if (!options?.skipCameraJump) {
          jumpToRef.current({
            fovy: (1.6 * Math.PI) / 180,
            coord: { ra: position.ra, dec: position.dec },
            duration: options?.animate ? 1000 : 0,
          })
        }
        
        // ランク取得を並行して実行（カメラ移動をブロックしない）
        try {
          const params = new URLSearchParams()
          if (search) params.set('search', search)
          params.set('sort_by', sortBy)
          params.set('sort_order', sortOrder)
          if (sortBy === 'altitude') {
            params.set('zenith_ra', String(committedZenith.ra))
            params.set('zenith_dec', String(committedZenith.dec))
          }
          if (dateRange[0]) params.set('date_from', dateRange[0])
          if (dateRange[1]) params.set('date_to', dateRange[1])
          
          const response = await fetch(`${API_BASE_URL}/api/pfs_designs/rank/${designIdToSelect}?${params}`)
          if (!response.ok) {
            console.error('Failed to fetch rank:', response.status)
            return
          }
          
          const rankData = await response.json()
          if (rankData.rank != null) {
            // ページ遷移
            const targetOffset = Math.floor(rankData.rank / limit) * limit
            setOffset(targetOffset)
            
            // スクロール要求を設定（リスト更新後にDesignListで処理される）
            setScrollToDesignId(designIdToSelect)
          }
        } catch (error) {
          console.error('Failed to fetch rank:', error)
        }
      }
    },
    [allPositions, designs, designDetail, selectedDesign, designId, navigate, search, sortBy, sortOrder, committedZenith, dateRange, limit, setOffset]
  )

  // 初回ロード処理: URLにdesignIdがあり、データがロードされた時に一度だけ実行
  const initialLoadHandledRef = useRef(false)
  useEffect(() => {
    // 既に処理済みならスキップ
    if (initialLoadHandledRef.current) return
    
    // URLにdesignIdがなければスキップ
    if (!designId) {
      initialLoadHandledRef.current = true
      return
    }
    
    // 基本データがまだロード中ならスキップ
    if (isLoading || isLoadingPositions) return
    
    // 位置情報からDesignを検索
    const position = allPositions.find((p) => p.id === designId)
    
    // allPositionsに含まれていない場合、designDetailからの取得を試みる
    // designDetailがまだロード中の場合は待つ
    if (!position) {
      if (isLoadingDetail) return  // designDetailのロードを待つ
      
      // designDetailもなければ処理完了（該当するdesignが存在しない）
      if (!designDetail) {
        initialLoadHandledRef.current = true
        return
      }
    }
    
    // 初回ロード処理を実行（アニメーションなし）
    selectDesignAndJump(designId, { animate: false })
    initialLoadHandledRef.current = true
  }, [designId, isLoading, isLoadingPositions, isLoadingDetail, allPositions, designDetail, selectDesignAndJump])

  // リスト更新後に選択状態を同期（ページ遷移後にDesignEntryを設定）
  useEffect(() => {
    if (!scrollToDesignId) return
    
    // リストにターゲットがあれば選択状態を更新
    const designInList = designs.find((d) => d.id === scrollToDesignId)
    if (designInList && (!selectedDesign || selectedDesign.id !== scrollToDesignId)) {
      setSelectedDesignState(designInList)
      navigate(`/designs/${designInList.id}`, { replace: true })
    }
  }, [designs, selectedDesign, navigate, scrollToDesignId])

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
    selectDesignAndJump,
    focusedDesign,
    setFocusedDesign,
    focusedFiber,
    setFocusedFiber,
    designDetail,
    isLoadingDetail,
    jumpTo,
    registerJumpTo,
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
    cameraCenter,
    setCameraCenter,
    scrollToDesignId,
    setScrollToDesignId,
  }

  return (
    <DesignsContext.Provider value={value}>{children}</DesignsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- Context hook pattern
export function useDesignsContext(): DesignsContextValue {
  const context = useContext(DesignsContext)
  if (!context) {
    throw new Error('useDesignsContext must be used within DesignsProvider')
  }
  return context
}
