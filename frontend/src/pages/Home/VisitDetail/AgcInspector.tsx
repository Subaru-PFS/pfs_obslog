import { useMemo, useState } from 'react'
import type { AgcVisitDetail, AgcExposure } from '../../../store/api/generatedApi'
import styles from './Inspector.module.scss'

interface AgcInspectorProps {
  agc: AgcVisitDetail
}

const PER_PAGE = 20

/**
 * 平均露出時間を計算
 */
function calculateAverageExptime(exposures: AgcExposure[]): number {
  const exptimes = exposures.map(e => e.exptime).filter((t): t is number => t !== null && t !== undefined)
  if (exptimes.length === 0) return 0
  return exptimes.reduce((a, b) => a + b, 0) / exptimes.length
}

/**
 * 日時をフォーマット
 */
function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function AgcInspector({ agc }: AgcInspectorProps) {
  const exposures = agc.exposures ?? []
  const avgExptime = useMemo(() => calculateAverageExptime(exposures), [exposures])
  const [page, setPage] = useState(0)

  const totalPages = Math.ceil(exposures.length / PER_PAGE)
  const pagedExposures = useMemo(
    () => exposures.slice(page * PER_PAGE, (page + 1) * PER_PAGE),
    [exposures, page]
  )

  return (
    <div className={styles.inspector}>
      <div className={styles.header}>
        <div className={styles.headerItem}>
          <span className={styles.headerLabel}>Exposures:</span>
          <span className={styles.headerValue}>{exposures.length}</span>
        </div>
        <div className={styles.headerItem}>
          <span className={styles.headerLabel}>Avg. Exptime:</span>
          <span className={styles.headerValue}>{avgExptime.toFixed(2)}s</span>
        </div>
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              ←
            </button>
            <span>
              {page * PER_PAGE + 1}-{Math.min((page + 1) * PER_PAGE, exposures.length)} of {exposures.length}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              →
            </button>
          </div>
        )}
      </div>

      <div className={styles.content}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Exposure ID</th>
              <th>Exptime</th>
              <th>Altitude</th>
              <th>Azimuth</th>
              <th>InsRot</th>
              <th>Taken at</th>
              <th>Guide Offset</th>
            </tr>
          </thead>
          <tbody>
            {pagedExposures.map(exp => (
              <tr key={exp.id}>
                <td>{exp.id}</td>
                <td>{exp.exptime?.toFixed(3) ?? '-'}s</td>
                <td>{exp.altitude?.toFixed(2) ?? '-'}°</td>
                <td>{exp.azimuth?.toFixed(2) ?? '-'}°</td>
                <td>{exp.insrot?.toFixed(2) ?? '-'}°</td>
                <td>{formatTime(exp.taken_at)}</td>
                <td>
                  {exp.guide_offset ? (
                    <span title={`ΔRA: ${exp.guide_offset.delta_ra?.toFixed(3) ?? '-'}, ΔDec: ${exp.guide_offset.delta_dec?.toFixed(3) ?? '-'}`}>
                      ✓
                    </span>
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
