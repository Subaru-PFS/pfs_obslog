import { useState, useMemo, useCallback, useEffect } from 'react'
import type {
  VisitListEntry,
  IicSequence,
  VisitGroup,
  VisitList as VisitListType,
} from '../../../types/visits'
import { useHomeContext } from '../context'
import styles from './VisitList.module.scss'

const PER_PAGE = 200

// モックデータ（API実装後は削除）
const mockVisitList: VisitListType = {
  visits: [
    {
      id: 123456,
      description: 'Test observation',
      issued_at: '2024-12-30T10:30:00Z',
      visit_set_id: 1,
      n_sps_exposures: 3,
      n_mcs_exposures: 2,
      n_agc_exposures: 1,
      avg_exptime: 900.5,
      avg_azimuth: 180.0,
      avg_altitude: 45.0,
      avg_ra: 150.5,
      avg_dec: 30.2,
      notes: [],
      pfs_design_id: '0x1234567890abcdef',
    },
    {
      id: 123455,
      description: 'Calibration',
      issued_at: '2024-12-30T10:15:00Z',
      visit_set_id: 1,
      n_sps_exposures: 1,
      n_mcs_exposures: 0,
      n_agc_exposures: 0,
      avg_exptime: 60.0,
      notes: [{ id: 1, body: 'Good data', created_at: '2024-12-30T10:20:00Z' }],
    },
    {
      id: 123454,
      description: 'Sky flat',
      issued_at: '2024-12-30T09:45:00Z',
      visit_set_id: 2,
      n_sps_exposures: 5,
      n_mcs_exposures: 5,
      n_agc_exposures: 5,
      avg_exptime: 30.0,
      notes: [],
    },
    {
      id: 123453,
      description: 'Focus sequence',
      issued_at: '2024-12-30T09:30:00Z',
      n_sps_exposures: 0,
      n_mcs_exposures: 3,
      n_agc_exposures: 0,
      avg_exptime: 5.0,
      notes: [],
    },
    {
      id: 123452,
      description: null,
      issued_at: '2024-12-30T09:00:00Z',
      n_sps_exposures: 0,
      n_mcs_exposures: 0,
      n_agc_exposures: 0,
      notes: [],
    },
  ],
  iic_sequence: [
    {
      visit_set_id: 1,
      sequence_type: 'scienceObject',
      name: 'Target A observation',
      comments: 'Main science target',
      cmd_str: 'sps expose object exptime=900 visit=123456',
      status: { status_id: 1, status_name: 'Complete', status_flag: true },
      notes: [],
      group: { group_id: 1, group_name: 'Group A' },
    },
    {
      visit_set_id: 2,
      sequence_type: 'flat',
      name: 'Evening flat',
      cmd_str: 'sps expose flat exptime=30',
      status: { status_id: 1, status_name: 'Complete', status_flag: true },
      notes: [],
    },
  ],
  count: 5,
}

/**
 * VisitListをIicSequenceでグループ化
 */
function compileVisitGroups(data: VisitListType): VisitGroup[] {
  const groups: VisitGroup[] = []
  const iicSequences = Object.fromEntries(
    data.iic_sequence.map((i) => [i.visit_set_id, i])
  )

  for (const v of data.visits) {
    const iicSequence =
      v.visit_set_id !== undefined ? iicSequences[v.visit_set_id] : undefined
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
 */
function getExposureClass(sps: number, mcs: number, agc: number): string {
  if (sps === 0 && mcs === 0 && agc === 0) return styles.exposureNone
  const count = (sps > 0 ? 1 : 0) + (mcs > 0 ? 1 : 0) + (agc > 0 ? 1 : 0)
  if (count > 1) return styles.exposureMixed
  if (sps > 0) return styles.exposureSps
  if (mcs > 0) return styles.exposureMcs
  return styles.exposureAgc
}

interface IicSequenceHeaderProps {
  iicSequence: IicSequence
}

function IicSequenceHeader({ iicSequence }: IicSequenceHeaderProps) {
  return (
    <div className={styles.iicSequence}>
      <div className={styles.title}>
        <span className={styles.sequenceId}>{iicSequence.visit_set_id}</span>
        <span className={styles.sequenceName}>{iicSequence.name || '(unnamed)'}</span>
        {iicSequence.sequence_type && (
          <span className={styles.sequenceType}>{iicSequence.sequence_type}</span>
        )}
        {iicSequence.group && (
          <span className={styles.sequenceGroup}>{iicSequence.group.group_name}</span>
        )}
      </div>
      <div className={styles.info}>
        {iicSequence.status && (
          <span
            className={`${styles.status} ${
              iicSequence.status.status_flag ? styles.statusOk : styles.statusError
            }`}
          >
            {iicSequence.status.status_name}
          </span>
        )}
      </div>
      {iicSequence.cmd_str && (
        <code className={styles.command} title={iicSequence.cmd_str}>
          {iicSequence.cmd_str}
        </code>
      )}
    </div>
  )
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
            const { date, time } = formatDate(visit.issued_at)
            const isSelected = selectedVisitId === visit.id

            return (
              <tr
                key={visit.id}
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
                    visit.n_sps_exposures,
                    visit.n_mcs_exposures,
                    visit.n_agc_exposures
                  )}`}
                >
                  {visit.n_sps_exposures}/{visit.n_mcs_exposures}/{visit.n_agc_exposures}
                </td>
                <td className={styles.colExptime}>
                  {visit.avg_exptime ? visit.avg_exptime.toFixed(1) : '-'}
                </td>
                <td className={styles.colNotes}>
                  {visit.notes.length > 0 && (
                    <span className={styles.notesBadge}>{visit.notes.length}</span>
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

  // TODO: RTK Query に置き換え
  // 現在はモックデータを使用
  const isLoading = false
  const isError = false
  const data = mockVisitList

  const visitGroups = useMemo(() => {
    if (!data) return []
    return compileVisitGroups(data)
  }, [data])

  const handleFirstPage = useCallback(() => setOffset(0), [])
  const handlePrevPage = useCallback(
    () => setOffset((prev) => Math.max(0, prev - PER_PAGE)),
    []
  )
  const handleNextPage = useCallback(
    () =>
      setOffset((prev) => {
        const maxOffset = data ? Math.max(0, data.count - PER_PAGE) : 0
        return Math.min(maxOffset, prev + PER_PAGE)
      }),
    [data]
  )
  const handleLastPage = useCallback(() => {
    if (data) {
      setOffset(Math.max(0, data.count - PER_PAGE))
    }
  }, [data])

  // キーボードナビゲーション
  const { selectedVisitId, setSelectedVisitId } = useHomeContext()
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!data || data.visits.length === 0) return

      const allVisits = data.visits
      const currentIndex = allVisits.findIndex((v) => v.id === selectedVisitId)

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (currentIndex < allVisits.length - 1) {
          setSelectedVisitId(allVisits[currentIndex + 1].id)
        } else if (currentIndex === -1 && allVisits.length > 0) {
          setSelectedVisitId(allVisits[0].id)
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (currentIndex > 0) {
          setSelectedVisitId(allVisits[currentIndex - 1].id)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [data, selectedVisitId, setSelectedVisitId])

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
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search (e.g., visit_id > 100000)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className={styles.pagination}>
          <button onClick={handleFirstPage} disabled={offset === 0} title="First page">
            ⏮
          </button>
          <button onClick={handlePrevPage} disabled={offset === 0} title="Previous page">
            ◀
          </button>
          <span className={styles.pageInfo}>
            {offset + 1} - {Math.min(offset + PER_PAGE, data?.count ?? 0)} / {data?.count ?? 0}
          </span>
          <button
            onClick={handleNextPage}
            disabled={!data || offset + PER_PAGE >= data.count}
            title="Next page"
          >
            ▶
          </button>
          <button
            onClick={handleLastPage}
            disabled={!data || offset + PER_PAGE >= data.count}
            title="Last page"
          >
            ⏭
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {visitGroups.length === 0 ? (
          <div className={styles.empty}>No visits found</div>
        ) : (
          visitGroups.map((group, index) => (
            <VisitGroupComponent key={group.iicSequence?.visit_set_id ?? `no-seq-${index}`} group={group} />
          ))
        )}
      </div>
    </div>
  )
}
