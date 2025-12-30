import { useMemo } from 'react'
import type { SpsVisitDetail, SpsExposure } from '../../../store/api/generatedApi'
import styles from './Inspector.module.scss'

interface SpsInspectorProps {
  sps: SpsVisitDetail
}

/**
 * camera_id からアーム名を取得
 * camera_id = (module - 1) * 4 + arm_index
 * arm_index: 1=b, 2=r, 3=n, 4=m
 */
function getArmName(cameraId: number): string {
  const armIndex = ((cameraId - 1) % 4) + 1
  switch (armIndex) {
    case 1: return 'b'
    case 2: return 'r'
    case 3: return 'n'
    case 4: return 'm'
    default: return '?'
  }
}

/**
 * camera_id からモジュール番号を取得
 */
function getModuleNumber(cameraId: number): number {
  return Math.floor((cameraId - 1) / 4) + 1
}

/**
 * 平均露出時間を計算
 */
function calculateAverageExptime(exposures: SpsExposure[]): number {
  const exptimes = exposures.map(e => e.exptime).filter((t): t is number => t !== null && t !== undefined)
  if (exptimes.length === 0) return 0
  return exptimes.reduce((a, b) => a + b, 0) / exptimes.length
}

export function SpsInspector({ sps }: SpsInspectorProps) {
  const exposures = sps.exposures ?? []
  const avgExptime = useMemo(() => calculateAverageExptime(exposures), [exposures])

  // カメラIDでグループ化（arm x module）
  const exposureGrid = useMemo(() => {
    const grid: Record<string, Record<number, SpsExposure>> = {}
    for (const exp of exposures) {
      const arm = getArmName(exp.camera_id)
      const module = getModuleNumber(exp.camera_id)
      if (!grid[arm]) grid[arm] = {}
      grid[arm][module] = exp
    }
    return grid
  }, [exposures])

  const arms = ['b', 'r', 'n', 'm']
  const modules = [1, 2, 3, 4]

  return (
    <div className={styles.inspector}>
      <div className={styles.header}>
        <div className={styles.headerItem}>
          <span className={styles.headerLabel}>Type:</span>
          <span className={styles.headerValue}>{sps.exp_type || '-'}</span>
        </div>
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
        <table className={styles.exposureTable}>
          <thead>
            <tr>
              <th>Arm</th>
              {modules.map(m => (
                <th key={m}>SM{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {arms.map(arm => {
              const hasArm = exposureGrid[arm] && Object.keys(exposureGrid[arm]).length > 0
              if (!hasArm) return null
              return (
                <tr key={arm}>
                  <th className={styles.armCell}>{arm.toUpperCase()}</th>
                  {modules.map(module => {
                    const exp = exposureGrid[arm]?.[module]
                    return (
                      <td key={module} className={exp ? styles.exposureCell : styles.emptyCell}>
                        {exp ? (
                          <div className={styles.exposureInfo}>
                            <div className={styles.cameraId}>#{exp.camera_id}</div>
                            <div className={styles.exptime}>{exp.exptime?.toFixed(2)}s</div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
