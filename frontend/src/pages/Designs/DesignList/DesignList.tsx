/**
 * DesignList - PFS Design一覧サイドパネル
 */
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useLocalStorage } from 'react-use'
import { Icon, IconButton } from '../../../components/Icon'
import { Tooltip } from '../../../components/Tooltip'
import { LoadingOverlay } from '../../../components/LoadingOverlay'
import { DateRangePicker, type DateRange } from '../../../components/DateRangePicker'
import { useDesignsContext, type SortBy } from '../DesignsContext'
import type { PfsDesignEntry, IdFormat } from '../types'
import { DESIGN_CROSS_MATCH_COSINE } from '../types'
import styles from './DesignList.module.scss'

// localStorage キー
const ID_FORMAT_KEY = '/DesignList/idFormat'
const SORT_BY_KEY = '/DesignList/sortBy'

/**
 * 赤道座標をラジアンに変換
 */
function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * 2点間の角距離のコサインを計算
 */
function cosineAngle(
  ra1: number,
  dec1: number,
  ra2: number,
  dec2: number
): number {
  const ra1Rad = deg2rad(ra1)
  const dec1Rad = deg2rad(dec1)
  const ra2Rad = deg2rad(ra2)
  const dec2Rad = deg2rad(dec2)

  return (
    Math.sin(dec1Rad) * Math.sin(dec2Rad) +
    Math.cos(dec1Rad) * Math.cos(dec2Rad) * Math.cos(ra1Rad - ra2Rad)
  )
}

/**
 * IDを指定の形式でフォーマット
 */
function formattedId(entry: PfsDesignEntry, idFormat: IdFormat): string {
  if (idFormat === 'hex') {
    return entry.id
  }
  return String(BigInt(`0x${entry.id}`))
}

export function DesignList() {
  const {
    designs,
    total,
    isLoading,
    isFetching,
    refetch,
    offset,
    setOffset,
    limit,
    search,
    setSearch,
    sortBy,
    setSortBy,
    setSortOrder,
    dateRange,
    setDateRange,
    selectedDesign,
    setSelectedDesign,
    focusedDesign,
    setFocusedDesign,
    jumpTo,
    zenithSkyCoord,
    isDraggingClock,
  } = useDesignsContext()

  const [idFormat, setIdFormat] = useLocalStorage<IdFormat>(ID_FORMAT_KEY, 'hex')
  // ソート設定をlocalStorageに保存（初回ロード時に復元）
  const [storedSortBy, setStoredSortBy] = useLocalStorage<SortBy>(SORT_BY_KEY, 'altitude')
  const [searchInput, setSearchInput] = useState(search)

  // 初回ロード時にlocalStorageからソート設定を復元
  const initializedRef = useRef(false)
  useEffect(() => {
    if (!initializedRef.current && storedSortBy) {
      setSortBy(storedSortBy)
      initializedRef.current = true
    }
  }, [storedSortBy, setSortBy])

  // 検索テキスト変更時のデバウンス
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value)
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      searchTimeoutRef.current = setTimeout(() => {
        setSearch(value)
        setOffset(0) // 検索時はページをリセット
      }, 300)
    },
    [setSearch, setOffset]
  )

  // ソート済みデザインをキャッシュ（ドラッグ中の更新抑制用）
  const sortedDesignsRef = useRef<PfsDesignEntry[]>([])
  const sortedDesigns = useMemo(() => {
    // 時計ドラッグ中は前のソート結果を維持（高度ソート時のみ）
    if (isDraggingClock && sortBy === 'altitude') {
      return sortedDesignsRef.current
    }
    // サーバーサイドでソート済み
    sortedDesignsRef.current = designs
    return designs
  }, [designs, sortBy, isDraggingClock])

  // グループ化（同一座標付近のDesignをまとめる）
  const groupedDesigns = useMemo(() => {
    const groups: PfsDesignEntry[][] = []
    for (const d of sortedDesigns) {
      const lastGroup = groups[groups.length - 1]
      const d0 = lastGroup?.[0]
      if (
        d0 &&
        cosineAngle(d.ra, d.dec, d0.ra, d0.dec) >= DESIGN_CROSS_MATCH_COSINE
      ) {
        lastGroup.push(d)
      } else {
        groups.push([d])
      }
    }
    return groups
  }, [sortedDesigns])

  // ページネーション
  const handlePrevPage = useCallback(() => {
    if (offset > 0) {
      setOffset(Math.max(0, offset - limit))
    }
  }, [offset, limit, setOffset])

  const handleNextPage = useCallback(() => {
    if (offset + limit < total) {
      setOffset(offset + limit)
    }
  }, [offset, limit, total, setOffset])

  // フォーカス中のDesignへスクロール
  useEffect(() => {
    if (focusedDesign) {
      document
        .querySelector(`[data-design-id="${focusedDesign.id}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [focusedDesign])

  // 選択されたDesignへスクロール（SkyViewerからの選択時など）
  useEffect(() => {
    if (!selectedDesign) return

    // リスト内に選択されたDesignがあるか確認し、あればスクロール
    const isInList = designs.some((d) => d.id === selectedDesign.id)
    
    if (isInList) {
      requestAnimationFrame(() => {
        document
          .querySelector(`[data-design-id="${selectedDesign.id}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    }
    // リスト内にない場合は何もしない（検索条件に合わないDesignは表示されない）
  }, [selectedDesign, designs])

  // エントリクリックハンドラ
  const handleEntryClick = useCallback(
    (entry: PfsDesignEntry) => {
      setSelectedDesign(entry)
      jumpTo({
        fovy: (0.8 * Math.PI) / 180,
        coord: { ra: entry.ra, dec: entry.dec },
        duration: 1000,
      })
    },
    [setSelectedDesign, jumpTo]
  )

  // FITSダウンロード
  const handleDownload = useCallback((entry: PfsDesignEntry) => {
    window.location.href = `/api/pfs_designs/${entry.id}.fits`
  }, [])

  // IDコピー
  const handleCopyId = useCallback(
    (entry: PfsDesignEntry) => {
      navigator.clipboard.writeText(formattedId(entry, idFormat ?? 'hex'))
    },
    [idFormat]
  )

  return (
    <div className={styles.listContainer}>
      <div className={styles.listHeader}>
        <div className={styles.searchRow}>
          <input
            type="search"
            placeholder="Search by name or ID"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          <IconButton icon="refresh" onClick={() => refetch()} title="Refresh" />
        </div>
        <div className={styles.sortCondition}>
          ID Format:&nbsp;
          <label>
            <input
              type="radio"
              checked={(idFormat ?? 'hex') === 'hex'}
              onChange={() => setIdFormat('hex')}
            />
            Hex
          </label>
          <label>
            <input
              type="radio"
              checked={(idFormat ?? 'hex') === 'decimal'}
              onChange={() => setIdFormat('decimal')}
            />
            Decimal
          </label>
        </div>
        <div className={styles.sortCondition}>
          Sort by:&nbsp;
          <label>
            <input
              type="radio"
              checked={sortBy === 'altitude'}
              onChange={() => {
                setSortBy('altitude')
                setSortOrder('desc')
                setStoredSortBy('altitude')
                setOffset(0)
              }}
            />
            Altitude
          </label>
          <label>
            <input
              type="radio"
              checked={sortBy === 'date_modified'}
              onChange={() => {
                setSortBy('date_modified')
                setSortOrder('desc')
                setStoredSortBy('date_modified')
                setOffset(0)
              }}
            />
            Date Modified
          </label>
        </div>
        <div className={styles.dateFilter}>
          <Icon name="date_range" size={16} />
          <DateRangePicker
            value={[dateRange[0] ?? undefined, dateRange[1] ?? undefined]}
            onChange={(range: DateRange) => {
              setDateRange([range[0] ?? null, range[1] ?? null])
              setOffset(0)
            }}
            className={styles.dateRangePicker}
          >
            {(startInput, endInput) => (
              <>
                {startInput}
                <span className={styles.dateRangeSeparator}>–</span>
                {endInput}
              </>
            )}
          </DateRangePicker>
          {(dateRange[0] || dateRange[1]) && (
            <Tooltip content="Clear date range">
              <button
                className={styles.clearDateButton}
                onClick={() => {
                  setDateRange([null, null])
                  setOffset(0)
                }}
              >
                <Icon name="close" size={14} />
              </button>
            </Tooltip>
          )}
        </div>
        <div className={styles.pagination}>
          <span>
            {total > 0
              ? `${offset + 1}-${Math.min(offset + limit, total)} of ${total}`
              : '0 designs'}
          </span>
          <IconButton
            icon="chevron_left"
            onClick={handlePrevPage}
            disabled={offset === 0}
            title="Previous page"
          />
          <IconButton
            icon="chevron_right"
            onClick={handleNextPage}
            disabled={offset + limit >= total}
            title="Next page"
          />
        </div>
      </div>

      <div className={styles.list}>
        {groupedDesigns.map((group, groupIndex) => (
          <div key={groupIndex} className={styles.entryGroup}>
            {group.map((entry) => (
              <Entry
                key={entry.id}
                entry={entry}
                idFormat={idFormat ?? 'hex'}
                isSelected={selectedDesign?.id === entry.id}
                isFocused={focusedDesign?.id === entry.id}
                zenithSkyCoord={zenithSkyCoord}
                onClick={() => handleEntryClick(entry)}
                onMouseEnter={() => setFocusedDesign(entry)}
                onMouseLeave={() => setFocusedDesign(undefined)}
                onDownload={() => handleDownload(entry)}
                onCopyId={() => handleCopyId(entry)}
              />
            ))}
          </div>
        ))}
      </div>

      <LoadingOverlay isLoading={isLoading || isFetching} />
    </div>
  )
}

interface EntryProps {
  entry: PfsDesignEntry
  idFormat: IdFormat
  isSelected: boolean
  isFocused: boolean
  zenithSkyCoord: { ra: number; dec: number }
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
  onDownload: () => void
  onCopyId: () => void
}

function Entry({
  entry,
  idFormat,
  isSelected,
  isFocused,
  zenithSkyCoord,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onDownload,
  onCopyId,
}: EntryProps) {
  const entryRef = useRef<HTMLDivElement>(null)

  // 高度計算
  const altitude = useMemo(() => {
    const cosAngle = cosineAngle(
      entry.ra,
      entry.dec,
      zenithSkyCoord.ra,
      zenithSkyCoord.dec
    )
    return 90 - (Math.acos(cosAngle) * 180) / Math.PI
  }, [entry.ra, entry.dec, zenithSkyCoord])

  // クラス名の決定
  const entryClassName = useMemo(() => {
    const classes = [styles.entry]
    if (isSelected && isFocused) {
      classes.push(styles.entrySelectedHover)
    } else if (isSelected) {
      classes.push(styles.entrySelected)
    } else if (isFocused) {
      classes.push(styles.entryHover)
    }
    return classes.join(' ')
  }, [isSelected, isFocused])

  return (
    <div
      ref={entryRef}
      className={entryClassName}
      data-design-id={entry.id}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={styles.entryInfo}>
        <Tooltip content={entry.name}>
          <div className={styles.entryName}>{entry.name || '-'}</div>
        </Tooltip>
        <div className={styles.entryId}>
          {formattedId(entry, idFormat)}
        </div>
        <div className={styles.entryDate}>{entry.date_modified}</div>
        <div className={styles.entryDate}>
          <Tooltip content="Number of Science Fibers">
            <span>{entry.design_rows.science}</span>
          </Tooltip>
          {' / '}
          <Tooltip content="Number of Sky Fibers">
            <span>{entry.design_rows.sky}</span>
          </Tooltip>
          {' / '}
          <Tooltip content="Number of FluxSTD Fibers">
            <span>{entry.design_rows.fluxstd}</span>
          </Tooltip>
          {' / '}
          <Tooltip content="Number of Photometries">
            <span>{entry.num_photometry_rows}</span>
          </Tooltip>
          {' / '}
          <Tooltip content="Number of Guide Stars">
            <span>{entry.num_guidestar_rows}</span>
          </Tooltip>
        </div>
        <div>
          α={entry.ra.toFixed(2)}°, δ={entry.dec.toFixed(2)}°,
          Alt.={altitude.toFixed(2)}°
        </div>
      </div>
      <div className={styles.entryButtons}>
        <IconButton
          icon="download"
          title="Download FITS"
          onClick={(e) => {
            e.stopPropagation()
            onDownload()
          }}
        />
        <IconButton
          icon="content_copy"
          title="Copy ID to Clipboard"
          onClick={(e) => {
            e.stopPropagation()
            onCopyId()
          }}
        />
      </div>
    </div>
  )
}
