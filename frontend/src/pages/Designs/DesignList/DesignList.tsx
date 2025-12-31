/**
 * DesignList - PFS Design一覧サイドパネル
 */
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { IconButton } from '../../../components/Icon'
import { Tooltip } from '../../../components/Tooltip'
import { LoadingOverlay } from '../../../components/LoadingOverlay'
import { useDesignsContext } from '../DesignsContext'
import type { PfsDesignEntry, IdFormat, SortOrder } from '../types'
import { DESIGN_CROSS_MATCH_COSINE } from '../types'
import styles from './DesignList.module.scss'

// localStorage キー
const ID_FORMAT_KEY = '/DesignList/idFormat'
const SORT_ORDER_KEY = '/DesignList/sortOrder'

/**
 * 安全に正規表現をコンパイル
 */
function safeRegexpCompile(pattern: string, flags?: string): RegExp {
  try {
    return new RegExp(pattern, flags)
  } catch {
    return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags)
  }
}

/**
 * localStorage から値を取得
 */
function useLocalStorage<T extends string>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key)
    return (stored as T) ?? defaultValue
  })

  const setStoredValue = useCallback(
    (newValue: T) => {
      setValue(newValue)
      localStorage.setItem(key, newValue)
    },
    [key]
  )

  return [value, setStoredValue]
}

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

/**
 * 高度順の比較関数
 */
function compareByAltitude(
  aEntry: PfsDesignEntry,
  bEntry: PfsDesignEntry,
  zenithRa: number,
  zenithDec: number
): number {
  const a = cosineAngle(aEntry.ra, aEntry.dec, zenithRa, zenithDec)
  const b = cosineAngle(bEntry.ra, bEntry.dec, zenithRa, zenithDec)

  if (Number.isNaN(a) && Number.isNaN(b)) {
    return aEntry.id.localeCompare(bEntry.id)
  }
  if (Number.isNaN(a)) return 1
  if (Number.isNaN(b)) return -1
  return b - a // コサインが大きい方が天頂に近い
}

/**
 * 更新日時順の比較関数
 */
function compareByDateModified(a: PfsDesignEntry, b: PfsDesignEntry): number {
  return a.date_modified === b.date_modified
    ? 0
    : a.date_modified < b.date_modified
      ? -1
      : 1
}

export function DesignList() {
  const {
    designs,
    isLoading,
    refetch,
    selectedDesign,
    setSelectedDesign,
    focusedDesign,
    setFocusedDesign,
    jumpTo,
    zenithSkyCoord,
  } = useDesignsContext()

  const [idFormat, setIdFormat] = useLocalStorage<IdFormat>(
    ID_FORMAT_KEY,
    'hex'
  )
  const [sortOrder, setSortOrder] = useLocalStorage<SortOrder>(
    SORT_ORDER_KEY,
    'altitude'
  )
  const [searchText, setSearchText] = useState('')

  // 検索用正規表現
  const searchRegexp = useMemo(
    () => safeRegexpCompile(searchText, 'i'),
    [searchText]
  )

  // フォーマット済みIDマップ
  const formattedIds = useMemo(
    () => new Map(designs.map((d) => [d, formattedId(d, idFormat)])),
    [designs, idFormat]
  )

  // 検索フィルタリング
  const filteredDesigns = useMemo(
    () =>
      designs.filter(
        (d) =>
          searchRegexp.test(d.name) ||
          searchRegexp.test(formattedIds.get(d) ?? '')
      ),
    [designs, searchRegexp, formattedIds]
  )

  // ソート
  const sortedDesigns = useMemo(() => {
    const sorted = [...filteredDesigns]
    if (sortOrder === 'altitude') {
      sorted.sort((a, b) =>
        compareByAltitude(a, b, zenithSkyCoord.ra, zenithSkyCoord.dec)
      )
    } else {
      sorted.sort((a, b) => -compareByDateModified(a, b))
    }
    return sorted
  }, [filteredDesigns, sortOrder, zenithSkyCoord])

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

  // フォーカス中のDesignへスクロール
  useEffect(() => {
    if (focusedDesign) {
      document
        .querySelector(`[data-design-id="${focusedDesign.id}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [focusedDesign])

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
      navigator.clipboard.writeText(formattedId(entry, idFormat))
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
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <IconButton icon="refresh" onClick={() => refetch()} title="Refresh" />
        </div>
        <div className={styles.sortCondition}>
          ID Format:&nbsp;
          <label>
            <input
              type="radio"
              checked={idFormat === 'hex'}
              onChange={() => setIdFormat('hex')}
            />
            Hex
          </label>
          <label>
            <input
              type="radio"
              checked={idFormat === 'decimal'}
              onChange={() => setIdFormat('decimal')}
            />
            Decimal
          </label>
        </div>
        <div className={styles.sortCondition}>
          Sort Order:&nbsp;
          <label>
            <input
              type="radio"
              checked={sortOrder === 'altitude'}
              onChange={() => setSortOrder('altitude')}
            />
            Altitude
          </label>
          <label>
            <input
              type="radio"
              checked={sortOrder === 'date_modified'}
              onChange={() => setSortOrder('date_modified')}
            />
            Date Modified
          </label>
        </div>
      </div>

      <div className={styles.list}>
        <LoadingOverlay isLoading={isLoading} />
        {groupedDesigns.map((group, groupIndex) => (
          <div key={groupIndex} className={styles.entryGroup}>
            {group.map((entry) => (
              <Entry
                key={entry.id}
                entry={entry}
                idFormat={idFormat}
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
      <div style={{ flexGrow: 1, flexShrink: 1 }}>
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
