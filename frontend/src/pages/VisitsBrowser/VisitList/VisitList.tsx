import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLocalStorage } from 'react-use'
import type { MaterialSymbol } from 'material-symbols'
import {
  useListVisitsApiVisitsGetQuery,
  generatedApi,
  type VisitListEntry,
  type IicSequence,
  type VisitList as VisitListType,
} from '../../../store/api/generatedApi'
import {
  useCreateVisitSetNoteApiVisitSetsVisitSetIdNotesPostMutation,
  useUpdateVisitSetNoteApiVisitSetsVisitSetIdNotesNoteIdPutMutation,
  useDeleteVisitSetNoteApiVisitSetsVisitSetIdNotesNoteIdDeleteMutation,
} from '../../../store/api/enhancedApi'

const { useLazyGetVisitRankApiVisitsVisitIdRankGetQuery } = generatedApi
import { useVisitsBrowserContext } from '../context'
import { Icon } from '../../../components/Icon'
import { LoadingSpinner } from '../../../components/LoadingSpinner'
import { LoadingOverlay } from '../../../components/LoadingOverlay'
import { Tooltip, TruncatedCell, TruncatedText } from '../../../components/Tooltip'
import { DateRangePicker, type DateRange } from '../../../components/DateRangePicker'
import { NoteList } from '../../../components/NoteList'
import { API_BASE_URL } from '../../../config'
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
  | 'notes_count'
  | 'notes_content'

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
  { key: 'notes_count', label: '#', icon: 'comment', description: 'Notes Count (hover for details)', defaultVisible: true },
  { key: 'notes_content', label: '', icon: 'notes', description: 'Notes Content', defaultVisible: false },
]

type ColumnVisibility = Record<ColumnKey, boolean>

const DEFAULT_COLUMN_VISIBILITY: ColumnVisibility = Object.fromEntries(
  COLUMN_DEFINITIONS.map((col) => [col.key, col.defaultVisible])
) as ColumnVisibility

const STORAGE_KEY = 'pfs-obslog:visitList:columns'

// =============================================================================
// Exposure count filter types
// =============================================================================
type ExposureCondition = '>=0' | '>0' | '==0'

interface ExposureFilters {
  sps: ExposureCondition
  mcs: ExposureCondition
  agc: ExposureCondition
}

function useColumnVisibility(): [ColumnVisibility, (key: ColumnKey, visible: boolean) => void] {
  const [stored, setStored] = useLocalStorage<ColumnVisibility>(STORAGE_KEY, DEFAULT_COLUMN_VISIBILITY)
  const columns = useMemo(() => ({ ...DEFAULT_COLUMN_VISIBILITY, ...stored }), [stored])

  const setColumnVisibility = useCallback((key: ColumnKey, visible: boolean) => {
    setStored((prev) => ({ ...DEFAULT_COLUMN_VISIBILITY, ...prev, [key]: visible }))
  }, [setStored])

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

// =============================================================================
// Exposure Type Selector
// =============================================================================
interface ExposureTypeSelectorProps {
  filters: ExposureFilters
  onChange: (filters: Partial<ExposureFilters>) => void
}

function ExposureTypeSelector({ filters, onChange }: ExposureTypeSelectorProps) {
  return (
    <div className={styles.exposureTypeSelector}>
      <ExposureTypeSelect
        label="#SpS:"
        value={filters.sps}
        onChange={(value) => onChange({ sps: value })}
        tooltip="Number of SpS Exposures"
      />
      <ExposureTypeSelect
        label="#MCS:"
        value={filters.mcs}
        onChange={(value) => onChange({ mcs: value })}
        tooltip="Number of MCS Exposures"
      />
      <ExposureTypeSelect
        label="#AGC:"
        value={filters.agc}
        onChange={(value) => onChange({ agc: value })}
        tooltip="Number of AGC Exposures"
      />
    </div>
  )
}

interface ExposureTypeSelectProps {
  label: string
  value: ExposureCondition
  onChange: (value: ExposureCondition) => void
  tooltip: string
}

function ExposureTypeSelect({ label, value, onChange, tooltip }: ExposureTypeSelectProps) {
  return (
    <Tooltip content={tooltip}>
      <div className={styles.exposureTypeSelect}>
        <span className={styles.exposureTypeLabel}>{label}</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as ExposureCondition)}
          className={styles.exposureTypeDropdown}
        >
          <option value=">=0">≥0</option>
          <option value=">0">&gt;0</option>
          <option value="==0">=0</option>
        </select>
      </div>
    </Tooltip>
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
  /** Callback when sequence group is clicked for filtering */
  onSequenceGroupClick?: (groupId: number, groupName: string) => void
}

function IicSequenceHeader({ iicSequence, visitId, onSequenceGroupClick }: IicSequenceHeaderProps) {
  const { setSelectedVisitId } = useVisitsBrowserContext()
  const [createNote] = useCreateVisitSetNoteApiVisitSetsVisitSetIdNotesPostMutation()
  const [updateNote] = useUpdateVisitSetNoteApiVisitSetsVisitSetIdNotesNoteIdPutMutation()
  const [deleteNote] = useDeleteVisitSetNoteApiVisitSetsVisitSetIdNotesNoteIdDeleteMutation()
  
  const handleClick = () => {
    if (visitId !== undefined) {
      setSelectedVisitId(visitId)
    }
  }

  const handleSequenceGroupClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (iicSequence.group && iicSequence.group.group_name && onSequenceGroupClick) {
      onSequenceGroupClick(iicSequence.group.group_id, iicSequence.group.group_name)
    }
  }

  const handleCreateNote = async (body: string) => {
    await createNote({
      visitSetId: iicSequence.iic_sequence_id,
      noteCreateRequest: { body },
    }).unwrap()
  }

  const handleUpdateNote = async (noteId: number, body: string) => {
    await updateNote({
      visitSetId: iicSequence.iic_sequence_id,
      noteId,
      noteUpdateRequest: { body },
    }).unwrap()
  }

  const handleDeleteNote = async (noteId: number) => {
    await deleteNote({
      visitSetId: iicSequence.iic_sequence_id,
      noteId,
    }).unwrap()
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
          <button
            className={styles.sequenceGroupButton}
            onClick={handleSequenceGroupClick}
            title={`Filter by group: ${iicSequence.group.group_name}`}
          >
            {iicSequence.group.group_name}
          </button>
        )}
      </div>
      {iicSequence.comments && (
        <div className={styles.comments}>{iicSequence.comments}</div>
      )}
      {iicSequence.cmd_str && (
        <TruncatedText as="code" className={styles.command} content={iicSequence.cmd_str}>
          {iicSequence.cmd_str}
        </TruncatedText>
      )}
      <div className={styles.sequenceNotes} onClick={(e) => e.stopPropagation()}>
        <NoteList
          notes={iicSequence.notes ?? []}
          createNote={handleCreateNote}
          updateNote={handleUpdateNote}
          deleteNote={handleDeleteNote}
        />
      </div>
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
  /** Callback when sequence group is clicked for filtering */
  onSequenceGroupClick?: (groupId: number, groupName: string) => void
}

function VisitGroupComponent({ group, columns, onSequenceGroupClick }: VisitGroupComponentProps) {
  const { selectedVisitId, setSelectedVisitId } = useVisitsBrowserContext()
  
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
        <IicSequenceHeader
          iicSequence={group.iicSequence}
          visitId={group.visits[0]?.id}
          onSequenceGroupClick={onSequenceGroupClick}
        />
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
              {columns.notes_count && <Tooltip content="Notes Count (hover for details)" as="th" className={styles.colNotesCount}><Icon name="comment" size={14} /></Tooltip>}
              {columns.notes_content && <Tooltip content="Notes Content" as="th" className={styles.colNotesContent}><Icon name="notes" size={14} /></Tooltip>}
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
                  <TruncatedCell content={visit.description || ''} className={styles.colDescription}>
                    {visit.description || '-'}
                  </TruncatedCell>
                )}
                {columns.date && <TruncatedCell content={date} className={styles.colDate}>{date}</TruncatedCell>}
                {columns.time && <TruncatedCell content={time} className={styles.colTime}>{time}</TruncatedCell>}
                {columns.exposures && (
                  <TruncatedCell
                    className={`${styles.colExposures} ${getExposureClass(
                      visit.n_sps_exposures ?? 0,
                      visit.n_mcs_exposures ?? 0,
                      visit.n_agc_exposures ?? 0
                    )}`}
                    content={`SPS: ${visit.n_sps_exposures ?? 0}, MCS: ${visit.n_mcs_exposures ?? 0}, AGC: ${visit.n_agc_exposures ?? 0}`}
                  >
                    {visit.n_sps_exposures ?? 0}/{visit.n_mcs_exposures ?? 0}/{visit.n_agc_exposures ?? 0}
                  </TruncatedCell>
                )}
                {columns.exptime && (
                  <TruncatedCell content={visit.avg_exptime ? `${visit.avg_exptime.toFixed(3)} s` : ''} className={styles.colExptime}>
                    {visit.avg_exptime ? visit.avg_exptime.toFixed(1) : '-'}
                  </TruncatedCell>
                )}
                {columns.pfs_design_id && (
                  <TruncatedCell content={visit.pfs_design_id ? `0x${visit.pfs_design_id}` : ''} className={styles.colDesign}>
                    {visit.pfs_design_id ? `0x${visit.pfs_design_id}` : '-'}
                  </TruncatedCell>
                )}
                {columns.ra && (
                  <TruncatedCell content={visit.avg_ra !== null && visit.avg_ra !== undefined ? `RA: ${visit.avg_ra.toFixed(6)}°` : ''} className={styles.colCoord}>
                    {visit.avg_ra !== null && visit.avg_ra !== undefined ? visit.avg_ra.toFixed(1) : '-'}
                  </TruncatedCell>
                )}
                {columns.dec && (
                  <TruncatedCell content={visit.avg_dec !== null && visit.avg_dec !== undefined ? `Dec: ${visit.avg_dec.toFixed(6)}°` : ''} className={styles.colCoord}>
                    {visit.avg_dec !== null && visit.avg_dec !== undefined ? visit.avg_dec.toFixed(1) : '-'}
                  </TruncatedCell>
                )}
                {columns.azimuth && (
                  <TruncatedCell content={visit.avg_azimuth !== null && visit.avg_azimuth !== undefined ? `Az: ${visit.avg_azimuth.toFixed(4)}°` : ''} className={styles.colCoord}>
                    {visit.avg_azimuth !== null && visit.avg_azimuth !== undefined ? visit.avg_azimuth.toFixed(2) : '-'}
                  </TruncatedCell>
                )}
                {columns.altitude && (
                  <TruncatedCell content={visit.avg_altitude !== null && visit.avg_altitude !== undefined ? `Alt: ${visit.avg_altitude.toFixed(4)}°` : ''} className={styles.colCoord}>
                    {visit.avg_altitude !== null && visit.avg_altitude !== undefined ? visit.avg_altitude.toFixed(2) : '-'}
                  </TruncatedCell>
                )}
                {columns.insrot && (
                  <TruncatedCell content={visit.avg_insrot !== null && visit.avg_insrot !== undefined ? `InsRot: ${visit.avg_insrot.toFixed(4)}°` : ''} className={styles.colCoord}>
                    {visit.avg_insrot !== null && visit.avg_insrot !== undefined ? visit.avg_insrot.toFixed(2) : '-'}
                  </TruncatedCell>
                )}
                {columns.notes_count && (
                  <td className={styles.colNotesCount}>
                    {(visit.notes?.length ?? 0) > 0 ? (
                      <Tooltip
                        content={
                          <ul className={styles.noteTooltipList}>
                            {visit.notes?.map((note, idx) => (
                              <li key={idx}>
                                <span className={styles.noteTooltipBody}>{note.body}</span>
                                <span className={styles.noteTooltipUser}>({note.user.account_name})</span>
                              </li>
                            ))}
                          </ul>
                        }
                      >
                        <span className={styles.notesBadge}>{visit.notes?.length}</span>
                      </Tooltip>
                    ) : '-'}
                  </td>
                )}
                {columns.notes_content && (
                  <td className={styles.colNotesContent}>
                    {(visit.notes?.length ?? 0) > 0 ? (
                      <ul className={styles.noteContentList}>
                        {visit.notes?.map((note, idx) => (
                          <li key={idx} className={styles.noteContentItem}>
                            <span className={styles.noteContentBody}>{note.body}</span>
                            <span className={styles.noteContentUser}>({note.user.account_name})</span>
                          </li>
                        ))}
                      </ul>
                    ) : '-'}
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

// Helper to parse URL search params
function parseUrlParams(searchParams: URLSearchParams) {
  const sql = searchParams.get('sql') ?? ''
  const startDate = searchParams.get('startDate') ?? undefined
  const endDate = searchParams.get('endDate') ?? undefined
  const sps = (searchParams.get('sps') ?? '>=0') as ExposureCondition
  const mcs = (searchParams.get('mcs') ?? '>=0') as ExposureCondition
  const agc = (searchParams.get('agc') ?? '>=0') as ExposureCondition
  
  return {
    sql,
    dateRange: [startDate, endDate] as DateRange,
    exposureFilters: {
      sps: ['>=0', '>0', '==0'].includes(sps) ? sps : '>=0',
      mcs: ['>=0', '>0', '==0'].includes(mcs) ? mcs : '>=0',
      agc: ['>=0', '>0', '==0'].includes(agc) ? agc : '>=0',
    } as ExposureFilters,
  }
}

export function VisitList() {
  const { selectedVisitId, setSelectedVisitId } = useVisitsBrowserContext()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Parse URL params once on mount and when they change externally
  const urlParams = useMemo(() => parseUrlParams(searchParams), [searchParams])
  
  // Local state for the search text box (may differ from applied SQL)
  const [searchQuery, setSearchQuery] = useState(urlParams.sql)
  // Applied SQL (synced with URL)
  const appliedSql = urlParams.sql || null
  // Date range (synced with URL)
  const dateRange = urlParams.dateRange
  // Exposure filters (synced with URL)
  const exposureFilters = urlParams.exposureFilters
  
  const [offset, setOffset] = useState(0)
  const [limit, setLimit] = useState(PER_PAGE)
  const contentRef = useRef<HTMLDivElement>(null)
  const scrollHeightBeforeLoadRef = useRef<number | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [shouldScrollToTop, setShouldScrollToTop] = useState(false)

  // Helper to update URL params
  const updateUrlParams = useCallback((updates: {
    sql?: string | null
    startDate?: string | null
    endDate?: string | null
    sps?: ExposureCondition
    mcs?: ExposureCondition
    agc?: ExposureCondition
  }) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev)
      
      if ('sql' in updates) {
        if (updates.sql) {
          newParams.set('sql', updates.sql)
        } else {
          newParams.delete('sql')
        }
      }
      if ('startDate' in updates) {
        if (updates.startDate) {
          newParams.set('startDate', updates.startDate)
        } else {
          newParams.delete('startDate')
        }
      }
      if ('endDate' in updates) {
        if (updates.endDate) {
          newParams.set('endDate', updates.endDate)
        } else {
          newParams.delete('endDate')
        }
      }
      if ('sps' in updates) {
        if (updates.sps && updates.sps !== '>=0') {
          newParams.set('sps', updates.sps)
        } else {
          newParams.delete('sps')
        }
      }
      if ('mcs' in updates) {
        if (updates.mcs && updates.mcs !== '>=0') {
          newParams.set('mcs', updates.mcs)
        } else {
          newParams.delete('mcs')
        }
      }
      if ('agc' in updates) {
        if (updates.agc && updates.agc !== '>=0') {
          newParams.set('agc', updates.agc)
        } else {
          newParams.delete('agc')
        }
      }
      
      return newParams
    }, { replace: true })
  }, [setSearchParams])

  // Wrapper functions to update URL when state changes
  const setAppliedSql = useCallback((sql: string | null) => {
    updateUrlParams({ sql })
    setOffset(0)
    setShouldScrollToTop(true)
  }, [updateUrlParams])
  
  const setDateRange = useCallback((range: DateRange) => {
    updateUrlParams({ 
      startDate: range[0] ?? null, 
      endDate: range[1] ?? null 
    })
    setOffset(0)
    setShouldScrollToTop(true)
  }, [updateUrlParams])
  
  const setExposureFilters = useCallback((partialFilters: Partial<ExposureFilters>) => {
    // Merge with current filters to get full filters
    const newFilters = { ...exposureFilters, ...partialFilters }
    updateUrlParams({ 
      sps: newFilters.sps, 
      mcs: newFilters.mcs, 
      agc: newFilters.agc 
    })
    setOffset(0)
    setShouldScrollToTop(true)
  }, [updateUrlParams, exposureFilters])

  // Column visibility state with localStorage persistence
  const [columns, setColumnVisibility] = useColumnVisibility()

  // Build effective SQL combining search query, date range, and exposure filters
  const effectiveSql = useMemo(() => {
    const conditions: string[] = []
    
    // Add search query condition
    if (appliedSql) {
      // Extract condition from "where ..." clause
      const match = appliedSql.match(/^\s*where\s+(.+)$/i)
      if (match) {
        conditions.push(`(${match[1]})`)
      }
    }
    
    // Add date range condition
    const [start, end] = dateRange
    if (start && end) {
      conditions.push(`(issued_at between '${start}' and '${end} 23:59:59')`)
    } else if (start) {
      conditions.push(`issued_at >= '${start}'`)
    } else if (end) {
      conditions.push(`issued_at <= '${end} 23:59:59'`)
    }

    // Add exposure filter conditions
    const exposureConditionMap: Record<ExposureCondition, string> = {
      '>=0': '',  // No filter needed
      '>0': ' > 0',
      '==0': ' = 0',
    }
    if (exposureFilters.sps !== '>=0') {
      conditions.push(`sps_count${exposureConditionMap[exposureFilters.sps]}`)
    }
    if (exposureFilters.mcs !== '>=0') {
      conditions.push(`mcs_count${exposureConditionMap[exposureFilters.mcs]}`)
    }
    if (exposureFilters.agc !== '>=0') {
      conditions.push(`agc_count${exposureConditionMap[exposureFilters.agc]}`)
    }
    
    if (conditions.length === 0) return undefined
    return `where ${conditions.join(' and ')}`
  }, [appliedSql, dateRange, exposureFilters])

  // RTK Query API - include sql parameter when set
  const { data, isLoading, isFetching, isError, error, refetch } = useListVisitsApiVisitsGetQuery({
    offset,
    limit,
    sql: effectiveSql,
  })

  // Lazy query for Go to Visit feature
  const [getVisitRank] = useLazyGetVisitRankApiVisitsVisitIdRankGetQuery()

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

  // Download CSV
  const handleDownloadCsv = useCallback(() => {
    const params = new URLSearchParams()
    // Use current SQL filter (WHERE clause)
    if (appliedSql) {
      params.set('sql', `select * ${appliedSql}`)
    } else {
      params.set('sql', 'select *')
    }
    // Set a reasonable limit for CSV export
    params.set('limit', '10000')
    
    const url = `${API_BASE_URL}/api/visits.csv?${params}`
    window.location.href = url
  }, [appliedSql])

  // Go to Visit by ID
  const handleGoToVisit = useCallback(async () => {
    const input = window.prompt('Enter Visit ID:')
    if (!input) return

    const visitId = parseInt(input.trim(), 10)
    if (isNaN(visitId)) {
      alert('Invalid Visit ID. Please enter a number.')
      return
    }

    try {
      const result = await getVisitRank({ visitId, sql: effectiveSql ?? undefined }).unwrap()
      if (result.rank === null || result.rank === undefined) {
        alert(`Visit ${visitId} not found${effectiveSql ? ' in current filter' : ''}.`)
        return
      }

      // Calculate offset to center the visit in the view
      // rank is 1-based, so visit at rank 1 should be at offset 0
      const targetOffset = Math.max(0, result.rank - 1 - Math.floor(PER_PAGE / 2))
      
      setOffset(targetOffset)
      setLimit(PER_PAGE)
      setSelectedVisitId(visitId)
      
      // Scroll to the visit after data loads
      setTimeout(() => {
        const element = document.querySelector(`[data-visit-id="${visitId}"]`)
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 500)
    } catch {
      alert('Failed to find visit. Please try again.')
    }
  }, [effectiveSql, getVisitRank, setSelectedVisitId])

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
    
    // Reset pagination (setAppliedSql already handles offset reset and scroll)
    setLimit(PER_PAGE)
  }, [searchQuery, isSqlQuery, setAppliedSql])

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
    setAppliedSql(null)
    setSearchError(null)
    setLimit(PER_PAGE)
  }, [setAppliedSql])

  // Handle sequence group filter
  const handleSequenceGroupFilter = useCallback((groupId: number, _groupName: string) => {
    const sql = `where sequence_group_id = ${groupId}`
    setSearchQuery(sql)
    setAppliedSql(sql)
    setSearchError(null)
    setLimit(PER_PAGE)
  }, [setAppliedSql])

  // Handle date range change (setDateRange already handles offset reset and scroll)
  const handleDateRangeChange = useCallback((newRange: DateRange) => {
    setDateRange(newRange)
    setLimit(PER_PAGE)
  }, [setDateRange])

  // Clear date range
  const handleClearDateRange = useCallback(() => {
    setDateRange([undefined, undefined])
    setLimit(PER_PAGE)
  }, [setDateRange])

  // キーボードナビゲーション
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
              onClick={() => window.open('#sql-syntax-help', '_blank')}
            >
              <Icon name="help" size={18} />
            </button>
          </Tooltip>
        </div>
        <div className={styles.toolbarActions}>
          <Tooltip content="Go to Visit">
            <button
              className={styles.toolbarButton}
              onClick={handleGoToVisit}
            >
              <Icon name="switch_access_shortcut" size={18} />
            </button>
          </Tooltip>
          <Tooltip content="Download as CSV">
            <button
              className={styles.toolbarButton}
              onClick={handleDownloadCsv}
            >
              <Icon name="download" size={18} />
            </button>
          </Tooltip>
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
              <Icon name="refresh" size={18} />
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

      {/* Filter row: exposure types, date range, and pagination */}
      <div className={styles.filterRow}>
        <div className={styles.filterRowLeft}>
          <ExposureTypeSelector
            filters={exposureFilters}
            onChange={setExposureFilters}
          />
          <div className={styles.filterSeparator} />
          <Icon name="date_range" size={18} />
          <DateRangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
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
                onClick={handleClearDateRange}
              >
                <Icon name="close" size={16} />
              </button>
            </Tooltip>
          )}
        </div>
        <div className={styles.filterRowRight}>
          <div className={styles.pagination}>
            <Tooltip content="First page">
              <button onClick={handleFirstPage} disabled={isFirstPage || isFetching}>
                <Icon name="first_page" size={16} />
              </button>
            </Tooltip>
            <Tooltip content="Previous page">
              <button onClick={handlePrevPage} disabled={isFirstPage || isFetching}>
                <Icon name="chevron_left" size={16} />
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
                <Icon name="chevron_right" size={16} />
              </button>
            </Tooltip>
            <Tooltip content="Last page">
              <button onClick={handleLastPage} disabled={isLastPage || isFetching}>
                <Icon name="last_page" size={16} />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Column selector row */}
      <div className={styles.columnsRow}>
        <ColumnSelector
          columns={columns}
          onToggle={setColumnVisibility}
        />
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
              <Icon name={isFirstPage ? 'refresh' : 'keyboard_arrow_up'} size={20} />
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
              onSequenceGroupClick={handleSequenceGroupFilter}
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
              <Icon name="keyboard_arrow_down" size={20} />
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
    </div>
  )
}
