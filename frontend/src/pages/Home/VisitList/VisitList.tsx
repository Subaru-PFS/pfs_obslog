import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import type { MaterialSymbol } from 'material-symbols'
import {
  useListVisitsApiVisitsGetQuery,
  type VisitListEntry,
  type IicSequence,
  type VisitList as VisitListType,
} from '../../../store/api/generatedApi'
import { useHomeContext } from '../context'
import { Icon } from '../../../components/Icon'
import { LoadingSpinner } from '../../../components/LoadingSpinner'
import { LoadingOverlay } from '../../../components/LoadingOverlay'
import { Tooltip } from '../../../components/Tooltip'
import styles from './VisitList.module.scss'

const PER_PAGE = 200

// =============================================================================
// Column definitions
// =============================================================================
type ColumnKey =
  | 'id'
  | 'description'
  | 'date'
  | 'time'
  | 'exposures'
  | 'exptime'
  | 'pfs_design_id'
  | 'ra'
  | 'dec'
  | 'azimuth'
  | 'altitude'
  | 'insrot'
  | 'notes'

interface ColumnDef {
  key: ColumnKey
  label: string
  icon?: MaterialSymbol
  description: string
  defaultVisible: boolean
}

const COLUMN_DEFINITIONS: ColumnDef[] = [
  { key: 'id', label: 'ID', description: 'Visit ID', defaultVisible: true },
  { key: 'description', label: '', icon: 'description', description: 'Description', defaultVisible: true },
  { key: 'date', label: '', icon: 'event', description: 'Date issued at', defaultVisible: true },
  { key: 'time', label: '', icon: 'schedule', description: 'Time issued at', defaultVisible: true },
  { key: 'exposures', label: '', icon: 'tag', description: 'Number of {SpS | MCS | AGC} Exposures', defaultVisible: true },
  { key: 'exptime', label: '', icon: 'shutter_speed', description: 'Exposure Time [s]', defaultVisible: true },
  { key: 'pfs_design_id', label: '', icon: 'design_services', description: 'PFS Design ID (HEX)', defaultVisible: false },
  { key: 'ra', label: 'α', description: 'Right Ascension [°]', defaultVisible: false },
  { key: 'dec', label: 'δ', description: 'Declination [°]', defaultVisible: false },
  { key: 'azimuth', label: 'A°', description: 'Azimuth [°]', defaultVisible: false },
  { key: 'altitude', label: 'E°', description: 'Altitude [°]', defaultVisible: false },
  { key: 'insrot', label: 'I°', description: 'Instrument Rotator [°]', defaultVisible: false },
  { key: 'notes', label: '', icon: 'notes', description: 'Notes', defaultVisible: true },
]

type ColumnVisibility = Record<ColumnKey, boolean>

const DEFAULT_COLUMN_VISIBILITY: ColumnVisibility = Object.fromEntries(
  COLUMN_DEFINITIONS.map((col) => [col.key, col.defaultVisible])
) as ColumnVisibility

const STORAGE_KEY = 'pfs-obslog:visitList:columns'

function useColumnVisibility(): [ColumnVisibility, (key: ColumnKey, visible: boolean) => void] {
  const [columns, setColumns] = useState<ColumnVisibility>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        return { ...DEFAULT_COLUMN_VISIBILITY, ...JSON.parse(saved) }
      }
    } catch {
      // ignore
    }
    return DEFAULT_COLUMN_VISIBILITY
  })

  const setColumnVisibility = useCallback((key: ColumnKey, visible: boolean) => {
    setColumns((prev) => {
      const next = { ...prev, [key]: visible }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return [columns, setColumnVisibility]
}

// =============================================================================
// Column Selector Component
// =============================================================================
interface ColumnSelectorProps {
  columns: ColumnVisibility
  onToggle: (key: ColumnKey, visible: boolean) => void
}

function ColumnSelector({ columns, onToggle }: ColumnSelectorProps) {
  return (
    <ul className={styles.columnSelector}>
      {COLUMN_DEFINITIONS.map((col) => (
        <li key={col.key}>
          <Tooltip content={col.description}>
            <label>
              <input
                type="checkbox"
                checked={columns[col.key]}
                onChange={(e) => onToggle(col.key, e.target.checked)}
              />
              {col.icon ? <Icon name={col.icon} size={14} /> : col.label}
            </label>
          </Tooltip>
        </li>
      ))}
    </ul>
  )
}

/** VisitGroupの型定義 */
interface VisitGroup {
  iicSequence?: IicSequence
  visits: VisitListEntry[]
}

/**
 * VisitListをIicSequenceでグループ化
 */
function compileVisitGroups(data: VisitListType): VisitGroup[] {
  const groups: VisitGroup[] = []
  const iicSequences = Object.fromEntries(
    data.iic_sequences.map((i) => [i.iic_sequence_id, i])
  )

  for (const v of data.visits) {
    const iicSequence =
      v.iic_sequence_id !== undefined && v.iic_sequence_id !== null
        ? iicSequences[v.iic_sequence_id]
        : undefined
    const lastGroup = groups[groups.length - 1]

    if (!lastGroup || lastGroup.iicSequence !== iicSequence) {
      groups.push({ iicSequence, visits: [] })
    }
    groups[groups.length - 1].visits.push(v)
  }

  return groups
}

/**
 * 日時をフォーマット
 */
function formatDate(dateStr: string | undefined): { date: string; time: string } {
  if (!dateStr) return { date: '-', time: '-' }
  const d = new Date(dateStr)
  const date = d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const time = d.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return { date, time }
}

/**
 * 露出数の背景色クラスを取得
 * Based on old-project colors.ts int2color() using HSV color wheel
 * bit pattern: (SPS > 0) << 2 | (MCS > 0) << 1 | (AGC > 0) << 0
 */
function getExposureClass(sps: number, mcs: number, agc: number): string {
  const bits = (sps > 0 ? 4 : 0) | (mcs > 0 ? 2 : 0) | (agc > 0 ? 1 : 0)
  switch (bits) {
    case 0:
      return styles.exposureNone // no exposures
    case 1:
      return styles.exposureAgc // AGC only
    case 2:
      return styles.exposureMcs // MCS only
    case 3:
      return styles.exposureMcsAgc // MCS + AGC
    case 4:
      return styles.exposureSps // SPS only
    case 5:
      return styles.exposureSpsAgc // SPS + AGC
    case 6:
      return styles.exposureSpsMcs // SPS + MCS
    case 7:
      return styles.exposureMixed // All three
    default:
      return styles.exposureNone
  }
}

interface IicSequenceHeaderProps {
  iicSequence: IicSequence
  visitId?: number
}

function IicSequenceHeader({ iicSequence, visitId }: IicSequenceHeaderProps) {
  const { setSelectedVisitId } = useHomeContext()
  
  const handleClick = () => {
    if (visitId !== undefined) {
      setSelectedVisitId(visitId)
    }
  }

  return (
    <div className={styles.iicSequence} onClick={handleClick}>
      <div className={styles.title}>
        <span className={styles.sequenceId}>{iicSequence.iic_sequence_id}</span>
        <span className={styles.sequenceName}>{iicSequence.name || '(unnamed)'}</span>
        {iicSequence.sequence_type && (
          <span className={getSequenceTypeClass(iicSequence.sequence_type)}>
            {iicSequence.sequence_type}
          </span>
        )}
        {iicSequence.group && (
          <span className={styles.sequenceGroup}>{iicSequence.group.group_name}</span>
        )}
      </div>
      {iicSequence.comments && (
        <div className={styles.comments}>{iicSequence.comments}</div>
      )}
      {iicSequence.cmd_str && (
        <code className={styles.command} title={iicSequence.cmd_str}>
          {iicSequence.cmd_str}
        </code>
      )}
    </div>
  )
}

/**
 * シーケンスタイプに応じたクラス名を取得
 */
function getSequenceTypeClass(sequenceType: string): string {
  const baseClass = styles.sequenceType
  switch (sequenceType) {
    case 'scienceObject':
    case 'scienceTrace':
      return `${baseClass} ${styles.sequenceTypeScience}`
    case 'scienceArc':
    case 'ditheredArcs':
      return `${baseClass} ${styles.sequenceTypeArc}`
    case 'flat':
      return `${baseClass} ${styles.sequenceTypeFlat}`
    default:
      return baseClass
  }
}

interface VisitGroupComponentProps {
  group: VisitGroup
  columns: ColumnVisibility
}

function VisitGroupComponent({ group, columns }: VisitGroupComponentProps) {
  const { selectedVisitId, setSelectedVisitId } = useHomeContext()
  
  // Check if any visit in this group is selected
  const hasSelectedVisit = group.visits.some(v => v.id === selectedVisitId)
  
  // Handle click on the group background (header area)
  const handleGroupClick = (e: React.MouseEvent) => {
    // Only handle clicks on the group container itself, not on child elements
    if (e.target === e.currentTarget && group.visits.length > 0) {
      setSelectedVisitId(group.visits[0].id)
    }
  }

  return (
    <div 
      className={`${styles.visitGroup} ${hasSelectedVisit ? styles.visitGroupSelected : ''}`}
      onClick={handleGroupClick}
    >
      {group.iicSequence ? (
        <IicSequenceHeader iicSequence={group.iicSequence} visitId={group.visits[0]?.id} />
      ) : (
        <div className={styles.noSequence}>No sequence</div>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.visitTable}>
          <thead>
            <tr>
              {columns.id && <Tooltip content="Visit ID" as="th" className={styles.colId}>ID</Tooltip>}
              {columns.description && <Tooltip content="Description" as="th" className={styles.colDescription}><Icon name="description" size={14} /></Tooltip>}
              {columns.date && <Tooltip content="Date issued at" as="th" className={styles.colDate}><Icon name="event" size={14} /></Tooltip>}
              {columns.time && <Tooltip content="Time issued at" as="th" className={styles.colTime}><Icon name="schedule" size={14} /></Tooltip>}
              {columns.exposures && <Tooltip content="Number of {SpS | MCS | AGC} Exposures" as="th" className={styles.colExposures}><Icon name="tag" size={14} /></Tooltip>}
              {columns.exptime && <Tooltip content="Exposure Time [s]" as="th" className={styles.colExptime}><Icon name="shutter_speed" size={14} /></Tooltip>}
              {columns.pfs_design_id && <Tooltip content="PFS Design ID (HEX)" as="th" className={styles.colDesign}><Icon name="design_services" size={14} /></Tooltip>}
              {columns.ra && <Tooltip content="Right Ascension [°]" as="th" className={styles.colCoord}>α</Tooltip>}
              {columns.dec && <Tooltip content="Declination [°]" as="th" className={styles.colCoord}>δ</Tooltip>}
              {columns.azimuth && <Tooltip content="Azimuth [°]" as="th" className={styles.colCoord}>A°</Tooltip>}
              {columns.altitude && <Tooltip content="Altitude [°]" as="th" className={styles.colCoord}>E°</Tooltip>}
              {columns.insrot && <Tooltip content="Instrument Rotator [°]" as="th" className={styles.colCoord}>I°</Tooltip>}
              {columns.notes && <Tooltip content="Notes" as="th" className={styles.colNotes}><Icon name="notes" size={14} /></Tooltip>}
            </tr>
          </thead>
        <tbody>
          {group.visits.map((visit) => {
            const { date, time } = formatDate(visit.issued_at ?? undefined)
            const isSelected = selectedVisitId === visit.id

            return (
              <tr
                key={visit.id}
                data-visit-id={visit.id}
                className={isSelected ? styles.selected : ''}
                onClick={() => setSelectedVisitId(visit.id)}
              >
                {columns.id && <td className={styles.colId}>{visit.id}</td>}
                {columns.description && (
                  <td className={styles.colDescription} title={visit.description || ''}>
                    {visit.description || '-'}
                  </td>
                )}
                {columns.date && <td className={styles.colDate} title={date}>{date}</td>}
                {columns.time && <td className={styles.colTime} title={time}>{time}</td>}
                {columns.exposures && (
                  <td
                    className={`${styles.colExposures} ${getExposureClass(
                      visit.n_sps_exposures ?? 0,
                      visit.n_mcs_exposures ?? 0,
                      visit.n_agc_exposures ?? 0
                    )}`}
                    title={`SPS: ${visit.n_sps_exposures ?? 0}, MCS: ${visit.n_mcs_exposures ?? 0}, AGC: ${visit.n_agc_exposures ?? 0}`}
                  >
                    {visit.n_sps_exposures ?? 0}/{visit.n_mcs_exposures ?? 0}/{visit.n_agc_exposures ?? 0}
                  </td>
                )}
                {columns.exptime && (
                  <td className={styles.colExptime} title={visit.avg_exptime ? `${visit.avg_exptime.toFixed(3)} s` : ''}>
                    {visit.avg_exptime ? visit.avg_exptime.toFixed(1) : '-'}
                  </td>
                )}
                {columns.pfs_design_id && (
                  <td className={styles.colDesign} title={visit.pfs_design_id ? `0x${visit.pfs_design_id}` : ''}>
                    {visit.pfs_design_id ? `0x${visit.pfs_design_id}` : '-'}
                  </td>
                )}
                {columns.ra && (
                  <td className={styles.colCoord} title={visit.avg_ra !== null && visit.avg_ra !== undefined ? `RA: ${visit.avg_ra.toFixed(6)}°` : ''}>
                    {visit.avg_ra !== null && visit.avg_ra !== undefined ? visit.avg_ra.toFixed(1) : '-'}
                  </td>
                )}
                {columns.dec && (
                  <td className={styles.colCoord} title={visit.avg_dec !== null && visit.avg_dec !== undefined ? `Dec: ${visit.avg_dec.toFixed(6)}°` : ''}>
                    {visit.avg_dec !== null && visit.avg_dec !== undefined ? visit.avg_dec.toFixed(1) : '-'}
                  </td>
                )}
                {columns.azimuth && (
                  <td className={styles.colCoord} title={visit.avg_azimuth !== null && visit.avg_azimuth !== undefined ? `Az: ${visit.avg_azimuth.toFixed(4)}°` : ''}>
                    {visit.avg_azimuth !== null && visit.avg_azimuth !== undefined ? visit.avg_azimuth.toFixed(2) : '-'}
                  </td>
                )}
                {columns.altitude && (
                  <td className={styles.colCoord} title={visit.avg_altitude !== null && visit.avg_altitude !== undefined ? `Alt: ${visit.avg_altitude.toFixed(4)}°` : ''}>
                    {visit.avg_altitude !== null && visit.avg_altitude !== undefined ? visit.avg_altitude.toFixed(2) : '-'}
                  </td>
                )}
                {columns.insrot && (
                  <td className={styles.colCoord} title={visit.avg_insrot !== null && visit.avg_insrot !== undefined ? `InsRot: ${visit.avg_insrot.toFixed(4)}°` : ''}>
                    {visit.avg_insrot !== null && visit.avg_insrot !== undefined ? visit.avg_insrot.toFixed(2) : '-'}
                  </td>
                )}
                {columns.notes && (
                  <td className={styles.colNotes} title={visit.notes && visit.notes.length > 0 ? `${visit.notes.length} note(s)` : ''}>
                    {(visit.notes?.length ?? 0) > 0 && (
                      <span className={styles.notesBadge}>{visit.notes?.length}</span>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
        </table>
      </div>
    </div>
  )
}

export function VisitList() {
  const [searchQuery, setSearchQuery] = useState('')
  const [appliedSql, setAppliedSql] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [limit, setLimit] = useState(PER_PAGE)
  const contentRef = useRef<HTMLDivElement>(null)
  const scrollHeightBeforeLoadRef = useRef<number | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [shouldScrollToTop, setShouldScrollToTop] = useState(false)

  // Column visibility state with localStorage persistence
  const [columns, setColumnVisibility] = useColumnVisibility()

  // RTK Query API - include sql parameter when set
  const { data, isLoading, isFetching, isError, error, refetch } = useListVisitsApiVisitsGetQuery({
    offset,
    limit,
    sql: appliedSql ?? undefined,
  })

  // Handle API error for search
  useEffect(() => {
    if (isError && error && 'data' in error) {
      const apiError = error as { data?: { detail?: string } }
      setSearchError(apiError.data?.detail ?? 'Search failed')
    } else {
      setSearchError(null)
    }
  }, [isError, error])

  const visitGroups = useMemo(() => {
    if (!data) return []
    return compileVisitGroups(data)
  }, [data])

  const totalCount = data?.count ?? 0
  const isFirstPage = offset === 0
  const isLastPage = offset + limit >= totalCount

  const handleFirstPage = useCallback(() => {
    setOffset(0)
    setLimit(PER_PAGE)
    setShouldScrollToTop(true)
  }, [])

  const handlePrevPage = useCallback(() => {
    setOffset((prev) => Math.max(0, prev - PER_PAGE))
    setLimit(PER_PAGE)
    setShouldScrollToTop(true)
  }, [])

  const handleNextPage = useCallback(() => {
    setOffset((prev) => prev + PER_PAGE)
    setLimit(PER_PAGE)
    setShouldScrollToTop(true)
  }, [])

  const handleLastPage = useCallback(() => {
    if (totalCount > 0) {
      const lastPageOffset = Math.floor((totalCount - 1) / PER_PAGE) * PER_PAGE
      setOffset(lastPageOffset)
      setLimit(PER_PAGE)
      setShouldScrollToTop(true)
    }
  }, [totalCount])

  // Load more: newer visits
  const handleLoadMoreNewer = useCallback(() => {
    const newOffset = Math.max(0, offset - (PER_PAGE >> 1))
    const increase = offset - newOffset
    if (increase === 0) return
    
    // Save current scroll height before loading
    if (contentRef.current) {
      scrollHeightBeforeLoadRef.current = contentRef.current.scrollHeight
    }
    setIsLoadingMore(true)
    setOffset(newOffset)
    setLimit((prev) => prev + increase)
  }, [offset])

  // Load more: older visits
  const handleLoadMoreOlder = useCallback(() => {
    setIsLoadingMore(true)
    setLimit((prev) => prev + (PER_PAGE >> 1))
  }, [])

  // Adjust scroll position after loading more newer visits
  useEffect(() => {
    if (!isFetching && isLoadingMore) {
      setIsLoadingMore(false)
      if (scrollHeightBeforeLoadRef.current !== null && contentRef.current) {
        const newScrollHeight = contentRef.current.scrollHeight
        const scrollDiff = newScrollHeight - scrollHeightBeforeLoadRef.current
        contentRef.current.scrollTop += scrollDiff
        scrollHeightBeforeLoadRef.current = null
      }
    }
  }, [isFetching, isLoadingMore])

  // Scroll to top after data load completes (for pagination/search)
  useEffect(() => {
    if (!isFetching && shouldScrollToTop) {
      setShouldScrollToTop(false)
      contentRef.current?.scrollTo(0, 0)
    }
  }, [isFetching, shouldScrollToTop])

  // Go to latest visits
  const handleGoToLatest = useCallback(() => {
    setOffset(0)
    setLimit(PER_PAGE)
    setShouldScrollToTop(true)
  }, [])

  // Refresh
  const handleRefresh = useCallback(() => {
    refetch()
  }, [refetch])

  // Check if the query looks like SQL WHERE clause
  const isSqlQuery = useCallback((query: string) => {
    return /^\s*where\s+/i.test(query)
  }, [])

  // Execute search
  const handleSearch = useCallback(() => {
    setSearchError(null)
    const query = searchQuery.trim()
    
    if (query === '') {
      // Clear filter
      setAppliedSql(null)
    } else if (isSqlQuery(query)) {
      // Direct SQL query
      setAppliedSql(query)
    } else {
      // Simple text search - wrap with any_column LIKE
      setAppliedSql(`where any_column like '%${query}%'`)
    }
    
    // Reset pagination
    setOffset(0)
    setLimit(PER_PAGE)
    setShouldScrollToTop(true)
  }, [searchQuery, isSqlQuery])

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
    setAppliedSql(null)
    setSearchError(null)
    setOffset(0)
    setLimit(PER_PAGE)
    setShouldScrollToTop(true)
  }, [])

  // キーボードナビゲーション
  const { selectedVisitId, setSelectedVisitId } = useHomeContext()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!data || data.visits.length === 0) return
      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      const allVisits = data.visits
      const currentIndex = allVisits.findIndex((v) => v.id === selectedVisitId)

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (currentIndex < allVisits.length - 1) {
          setSelectedVisitId(allVisits[currentIndex + 1].id)
        } else if (currentIndex === -1 && allVisits.length > 0) {
          setSelectedVisitId(allVisits[0].id)
        } else if (currentIndex === allVisits.length - 1 && !isLastPage) {
          // At the end, load more older
          handleLoadMoreOlder()
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (currentIndex > 0) {
          setSelectedVisitId(allVisits[currentIndex - 1].id)
        } else if (currentIndex === 0 && !isFirstPage) {
          // At the start, load more newer
          handleLoadMoreNewer()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [data, selectedVisitId, setSelectedVisitId, isFirstPage, isLastPage, handleLoadMoreNewer, handleLoadMoreOlder])

  // Scroll to selected visit
  useEffect(() => {
    if (selectedVisitId) {
      const element = document.querySelector(`[data-visit-id="${selectedVisitId}"]`)
      element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedVisitId])

  if (isLoading) {
    return (
      <div className={styles.visitList}>
        <div className={styles.loading}>
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className={styles.visitList}>
        <div className={styles.error}>Failed to load visits</div>
      </div>
    )
  }

  return (
    <div className={styles.visitList}>
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <form onSubmit={(e) => { e.preventDefault(); handleSearch() }}>
            <input
              type="search"
              className={`${styles.searchInput} ${isSqlQuery(searchQuery) ? styles.sqlInput : ''} ${searchError ? styles.errorInput : ''}`}
              placeholder="Search or enter WHERE clause..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                // Clear error when typing
                if (searchError) setSearchError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  handleClearSearch()
                }
              }}
            />
          </form>
          {appliedSql && (
            <Tooltip content="Clear search">
              <button
                className={styles.toolbarButton}
                onClick={handleClearSearch}
              >
                <Icon name="close" size={18} />
              </button>
            </Tooltip>
          )}
          <Tooltip content="Search">
            <button
              className={styles.toolbarButton}
              onClick={handleSearch}
              disabled={isFetching}
            >
              <Icon name="search" size={18} />
            </button>
          </Tooltip>
          <Tooltip content="Syntax Docs">
            <button
              className={styles.toolbarButton}
              onClick={() => window.open('/visits/sql-syntax-help', '_blank')}
            >
              <Icon name="help" size={18} />
            </button>
          </Tooltip>
        </div>
        <div className={styles.toolbarActions}>
          <Tooltip content="Go to latest visits">
            <button
              className={styles.toolbarButton}
              onClick={handleGoToLatest}
              disabled={isFirstPage && !appliedSql}
            >
              <Icon name="vertical_align_top" size={18} />
            </button>
          </Tooltip>
          <Tooltip content="Refresh">
            <button
              className={styles.toolbarButton}
              onClick={handleRefresh}
              disabled={isFetching}
            >
              <Icon name={isFetching ? 'hourglass_empty' : 'refresh'} size={18} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Search error message */}
      {searchError && (
        <div className={styles.searchError}>
          <Icon name="error" size={16} />
          <span>{searchError}</span>
        </div>
      )}

      {/* Column selector row */}
      <div className={styles.columnsRow}>
        <ColumnSelector columns={columns} onToggle={setColumnVisibility} />
      </div>

      <div className={styles.content} ref={contentRef}>
        <LoadingOverlay isLoading={isFetching || isLoadingMore} />

        {/* Navigation at top - scrolls with content */}
        <div className={styles.paginationTop}>
          <Tooltip content="Next newer visits">
            <button
              className={styles.paginationButton}
              onClick={handlePrevPage}
              disabled={isFirstPage || isFetching}
            >
              <Icon name="chevron_left" size={20} />
            </button>
          </Tooltip>
          <Tooltip content={isFirstPage ? 'Refresh' : 'Load more newer visits'}>
            <button
              className={styles.paginationButton}
              onClick={handleLoadMoreNewer}
              disabled={isFirstPage || isFetching}
            >
              <Icon name={isFetching && !isFirstPage ? 'hourglass_empty' : (isFirstPage ? 'refresh' : 'keyboard_arrow_up')} size={20} />
            </button>
          </Tooltip>
          <Tooltip content="Next older visits">
            <button
              className={styles.paginationButton}
              onClick={handleNextPage}
              disabled={isLastPage || isFetching}
            >
              <Icon name="chevron_right" size={20} />
            </button>
          </Tooltip>
        </div>

        {visitGroups.length === 0 ? (
          <div className={styles.empty}>No visits found</div>
        ) : (
          visitGroups.map((group, index) => (
            <VisitGroupComponent
              key={group.iicSequence?.iic_sequence_id ?? `no-seq-${index}`}
              group={group}
              columns={columns}
            />
          ))
        )}

        {/* Navigation at bottom - scrolls with content */}
        <div className={styles.paginationBottom}>
          <Tooltip content="Next newer visits">
            <button
              className={styles.paginationButton}
              onClick={handlePrevPage}
              disabled={isFirstPage || isFetching}
            >
              <Icon name="chevron_left" size={20} />
            </button>
          </Tooltip>
          <Tooltip content="Load more older visits">
            <button
              className={styles.paginationButton}
              onClick={handleLoadMoreOlder}
              disabled={isLastPage || isFetching}
            >
              <Icon name={isFetching ? 'hourglass_empty' : 'keyboard_arrow_down'} size={20} />
            </button>
          </Tooltip>
          <Tooltip content="Next older visits">
            <button
              className={styles.paginationButton}
              onClick={handleNextPage}
              disabled={isLastPage || isFetching}
            >
              <Icon name="chevron_right" size={20} />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.pagination}>
          <Tooltip content="Go to latest visits">
            <button
              onClick={handleGoToLatest}
              disabled={isFirstPage || isFetching}
            >
              <Icon name="vertical_align_top" size={18} />
            </button>
          </Tooltip>
          <Tooltip content="Refresh">
            <button onClick={handleRefresh} disabled={isFetching}>
              <Icon name={isFetching ? 'hourglass_empty' : 'refresh'} size={18} />
            </button>
          </Tooltip>
          <Tooltip content="First page">
            <button onClick={handleFirstPage} disabled={isFirstPage || isFetching}>
              <Icon name="first_page" size={18} />
            </button>
          </Tooltip>
          <Tooltip content="Previous page">
            <button onClick={handlePrevPage} disabled={isFirstPage || isFetching}>
              <Icon name="chevron_left" size={18} />
            </button>
          </Tooltip>
          <Tooltip content={`Displaying ${offset + 1} – ${Math.min(offset + limit, totalCount)} of ${totalCount} visits`}>
            <span className={styles.pageInfo}>
              <span className={styles.pageRange}>{offset + 1} – {Math.min(offset + limit, totalCount)}</span>
              <span className={styles.pageTotal}>{totalCount}</span>
            </span>
          </Tooltip>
          <Tooltip content="Next page">
            <button onClick={handleNextPage} disabled={isLastPage || isFetching}>
              <Icon name="chevron_right" size={18} />
            </button>
          </Tooltip>
          <Tooltip content="Last page">
            <button onClick={handleLastPage} disabled={isLastPage || isFetching}>
              <Icon name="last_page" size={18} />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
