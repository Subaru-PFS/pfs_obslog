import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  useListVisitsApiVisitsGetQuery,
  type VisitListEntry,
  type IicSequence,
  type VisitList as VisitListType,
} from '../../../store/api/generatedApi'
import { useHomeContext } from '../context'
import { Icon } from '../../../components/Icon'
import styles from './VisitList.module.scss'

const PER_PAGE = 200

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
}

function IicSequenceHeader({ iicSequence }: IicSequenceHeaderProps) {
  return (
    <div className={styles.iicSequence}>
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
}

function VisitGroupComponent({ group }: VisitGroupComponentProps) {
  const { selectedVisitId, setSelectedVisitId } = useHomeContext()

  return (
    <div className={styles.visitGroup}>
      {group.iicSequence ? (
        <IicSequenceHeader iicSequence={group.iicSequence} />
      ) : (
        <div className={styles.noSequence}>No sequence</div>
      )}

      <table className={styles.visitTable}>
        <thead>
          <tr>
            <th className={styles.colId}>ID</th>
            <th className={styles.colDescription}>Description</th>
            <th className={styles.colDate}>Date</th>
            <th className={styles.colTime}>Time</th>
            <th className={styles.colExposures}>S/M/A</th>
            <th className={styles.colExptime}>Exp</th>
            <th className={styles.colNotes}>Notes</th>
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
                <td className={styles.colId}>{visit.id}</td>
                <td className={styles.colDescription} title={visit.description || ''}>
                  {visit.description || '-'}
                </td>
                <td className={styles.colDate}>{date}</td>
                <td className={styles.colTime}>{time}</td>
                <td
                  className={`${styles.colExposures} ${getExposureClass(
                    visit.n_sps_exposures ?? 0,
                    visit.n_mcs_exposures ?? 0,
                    visit.n_agc_exposures ?? 0
                  )}`}
                >
                  {visit.n_sps_exposures ?? 0}/{visit.n_mcs_exposures ?? 0}/{visit.n_agc_exposures ?? 0}
                </td>
                <td className={styles.colExptime}>
                  {visit.avg_exptime ? visit.avg_exptime.toFixed(1) : '-'}
                </td>
                <td className={styles.colNotes}>
                  {(visit.notes?.length ?? 0) > 0 && (
                    <span className={styles.notesBadge}>{visit.notes?.length}</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function VisitList() {
  const [searchQuery, setSearchQuery] = useState('')
  const [offset, setOffset] = useState(0)
  const [limit, setLimit] = useState(PER_PAGE)
  const contentRef = useRef<HTMLDivElement>(null)

  // RTK Query API
  const { data, isLoading, isFetching, isError, refetch } = useListVisitsApiVisitsGetQuery({
    offset,
    limit,
  })

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
    contentRef.current?.scrollTo(0, 0)
  }, [])

  const handlePrevPage = useCallback(() => {
    setOffset((prev) => Math.max(0, prev - PER_PAGE))
    setLimit(PER_PAGE)
    contentRef.current?.scrollTo(0, 0)
  }, [])

  const handleNextPage = useCallback(() => {
    setOffset((prev) => prev + PER_PAGE)
    setLimit(PER_PAGE)
    contentRef.current?.scrollTo(0, 0)
  }, [])

  const handleLastPage = useCallback(() => {
    if (totalCount > 0) {
      const lastPageOffset = Math.floor((totalCount - 1) / PER_PAGE) * PER_PAGE
      setOffset(lastPageOffset)
      setLimit(PER_PAGE)
      contentRef.current?.scrollTo(0, 0)
    }
  }, [totalCount])

  // Load more: newer visits
  const handleLoadMoreNewer = useCallback(() => {
    const newOffset = Math.max(0, offset - (PER_PAGE >> 1))
    const increase = offset - newOffset
    setOffset(newOffset)
    setLimit((prev) => prev + increase)
  }, [offset])

  // Load more: older visits
  const handleLoadMoreOlder = useCallback(() => {
    setLimit((prev) => prev + (PER_PAGE >> 1))
  }, [])

  // Go to latest visits
  const handleGoToLatest = useCallback(() => {
    setOffset(0)
    setLimit(PER_PAGE)
    contentRef.current?.scrollTo(0, 0)
  }, [])

  // Refresh
  const handleRefresh = useCallback(() => {
    refetch()
  }, [refetch])

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
        <div className={styles.loading}>Loading...</div>
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
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search visits..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            className={styles.toolbarButton}
            title="Search"
            disabled
          >
            <Icon name="search" size={18} />
          </button>
          <button
            className={styles.toolbarButton}
            title="Help"
            disabled
          >
            <Icon name="help" size={18} />
          </button>
        </div>
        <div className={styles.toolbarActions}>
          <button
            className={styles.toolbarButton}
            onClick={handleGoToLatest}
            title="Go to latest visits"
            disabled={isFirstPage}
          >
            <Icon name="vertical_align_top" size={18} />
          </button>
          <button
            className={styles.toolbarButton}
            onClick={handleRefresh}
            title="Refresh"
            disabled={isFetching}
          >
            <Icon name={isFetching ? 'hourglass_empty' : 'refresh'} size={18} />
          </button>
        </div>
      </div>

      <div className={styles.content} ref={contentRef}>
        {isFetching && <div className={styles.loadingOverlay}>Loading...</div>}

        {/* Navigation at top - scrolls with content */}
        <div className={styles.paginationTop}>
          <button
            className={styles.paginationButton}
            onClick={handlePrevPage}
            disabled={isFirstPage}
            title="Previous page (newer visits)"
          >
            <Icon name="chevron_left" size={20} />
          </button>
          <button
            className={`${styles.paginationButton} ${styles.loadMore}`}
            onClick={handleLoadMoreNewer}
            disabled={isFirstPage}
            title="Load more newer visits"
          >
            <Icon name={isFirstPage ? 'refresh' : 'keyboard_arrow_up'} size={20} />
          </button>
          <button
            className={styles.paginationButton}
            onClick={handleNextPage}
            disabled={isLastPage}
            title="Next page (older visits)"
          >
            <Icon name="chevron_right" size={20} />
          </button>
        </div>

        {visitGroups.length === 0 ? (
          <div className={styles.empty}>No visits found</div>
        ) : (
          visitGroups.map((group, index) => (
            <VisitGroupComponent
              key={group.iicSequence?.iic_sequence_id ?? `no-seq-${index}`}
              group={group}
            />
          ))
        )}

        {/* Navigation at bottom - scrolls with content */}
        <div className={styles.paginationBottom}>
          <button
            className={styles.paginationButton}
            onClick={handlePrevPage}
            disabled={isFirstPage}
            title="Previous page (newer visits)"
          >
            <Icon name="chevron_left" size={20} />
          </button>
          <button
            className={`${styles.paginationButton} ${styles.loadMore}`}
            onClick={handleLoadMoreOlder}
            disabled={isLastPage}
            title="Load more older visits"
          >
            <Icon name="keyboard_arrow_down" size={20} />
          </button>
          <button
            className={styles.paginationButton}
            onClick={handleNextPage}
            disabled={isLastPage}
            title="Next page (older visits)"
          >
            <Icon name="chevron_right" size={20} />
          </button>
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.pagination}>
          <button onClick={handleFirstPage} disabled={isFirstPage} title="First page">
            <Icon name="first_page" size={18} />
          </button>
          <button onClick={handlePrevPage} disabled={isFirstPage} title="Previous page">
            <Icon name="chevron_left" size={18} />
          </button>
          <span className={styles.pageInfo}>
            {offset + 1} - {Math.min(offset + limit, totalCount)} / {totalCount}
          </span>
          <button onClick={handleNextPage} disabled={isLastPage} title="Next page">
            <Icon name="chevron_right" size={18} />
          </button>
          <button onClick={handleLastPage} disabled={isLastPage} title="Last page">
            <Icon name="last_page" size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
