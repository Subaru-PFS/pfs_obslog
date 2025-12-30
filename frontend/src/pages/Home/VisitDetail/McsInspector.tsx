import { useMemo } from 'react'
import type { McsVisitDetail, McsExposure } from '../../../store/api/generatedApi'
import styles from './Inspector.module.scss'

interface McsInspectorProps {
  mcs: McsVisitDetail
}

/**
 * 平均露出時間を計算
 */
function calculateAverageExptime(exposures: McsExposure[]): number {
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

export function McsInspector({ mcs }: McsInspectorProps) {
  const exposures = mcs.exposures ?? []
  const avgExptime = useMemo(() => calculateAverageExptime(exposures), [exposures])

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
      </div>

      <div className={styles.content}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Frame ID</th>
              <th>Exptime</th>
              <th>Altitude</th>
              <th>Azimuth</th>
              <th>InsRot</th>
              <th>Taken at</th>
            </tr>
          </thead>
          <tbody>
            {exposures.map(exp => (
              <tr key={exp.frame_id}>
                <td>{exp.frame_id}</td>
                <td>{exp.exptime?.toFixed(3) ?? '-'}s</td>
                <td>{exp.altitude?.toFixed(2) ?? '-'}°</td>
                <td>{exp.azimuth?.toFixed(2) ?? '-'}°</td>
                <td>{exp.insrot?.toFixed(2) ?? '-'}°</td>
                <td>{formatTime(exp.taken_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
