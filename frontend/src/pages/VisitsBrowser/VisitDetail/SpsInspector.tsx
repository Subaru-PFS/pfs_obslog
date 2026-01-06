import { useMemo, useState } from 'react'
import type { SpsVisitDetail, SpsExposure } from '../../../store/api/generatedApi'
import { LazyImage } from '../../../components/LazyImage'
import { IconButton } from '../../../components/Icon'
import { API_BASE_URL } from '../../../config'
import { useVisitsBrowserContext } from '../context'
import { useVisitDetailContext } from './context'
import styles from './Inspector.module.scss'

type SpsImageType = 'raw' | 'postISRCCD'
type ImageScale = 0.5 | 1 | 2

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

/** プレビュー画像のサイズ */
const PREVIEW_SIZES = {
  0.5: { width: 128, height: 128 },
  1: { width: 256, height: 256 },
  2: { width: 512, height: 512 },
}

function getSpsPreviewUrl(
  visitId: number,
  cameraId: number,
  imageType: SpsImageType,
  scale: ImageScale
): string {
  const params = new URLSearchParams({
    type: imageType,
    scale: String(scale),
  })
  return `${API_BASE_URL}/api/fits/visits/${visitId}/sps/${cameraId}.png?${params}`
}

function getSpsLargePreviewUrl(visitId: number, cameraId: number, imageType: SpsImageType): string {
  const params = new URLSearchParams({ type: imageType })
  return `${API_BASE_URL}/api/fits/visits/${visitId}/sps/${cameraId}.png?${params}`
}

function getSpsFitsDownloadUrl(visitId: number, cameraId: number, imageType: SpsImageType): string {
  const params = new URLSearchParams({ type: imageType })
  return `${API_BASE_URL}/api/fits/visits/${visitId}/sps/${cameraId}.fits?${params}`
}

function downloadAllSpsExposures(
  visitId: number,
  exposures: SpsExposure[],
  imageType: SpsImageType
): void {
  for (const exp of exposures) {
    const url = getSpsFitsDownloadUrl(visitId, exp.camera_id, imageType)
    window.open(url)
  }
}

export function SpsInspector({ sps }: SpsInspectorProps) {
  const { selectedVisitId } = useVisitsBrowserContext()
  const { selectedFitsId, setSelectedFitsId } = useVisitDetailContext()
  const exposures = sps.exposures ?? []
  const avgExptime = useMemo(() => calculateAverageExptime(exposures), [exposures])
  const [imageType, setImageType] = useState<SpsImageType>('raw')
  const [imageScale, setImageScale] = useState<ImageScale>(1)

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

  // 表示順序: NIR, Red, Mid-Red, Blue（上から下）
  const arms = ['n', 'r', 'm', 'b']
  const modules = [1, 2, 3, 4]
  const hasData = (arm: string) => exposureGrid[arm] && Object.keys(exposureGrid[arm]).length > 0
  const previewSize = PREVIEW_SIZES[imageScale]

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

      <div className={styles.settings}>
        <div className={styles.settingsGroup}>
          <span className={styles.settingsLabel}>Image Type:</span>
          <label>
            <input
              type="radio"
              name="spsImageType"
              value="raw"
              checked={imageType === 'raw'}
              onChange={(e) => setImageType(e.target.value as SpsImageType)}
            />
            Raw
          </label>
          <label>
            <input
              type="radio"
              name="spsImageType"
              value="postISRCCD"
              checked={imageType === 'postISRCCD'}
              onChange={(e) => setImageType(e.target.value as SpsImageType)}
            />
            postISRCCD
          </label>
        </div>
        <div className={styles.settingsGroup}>
          <span className={styles.settingsLabel}>Image Size:</span>
          <label>
            <input
              type="radio"
              name="spsImageScale"
              value="0.5"
              checked={imageScale === 0.5}
              onChange={() => setImageScale(0.5)}
            />
            Small
          </label>
          <label>
            <input
              type="radio"
              name="spsImageScale"
              value="1"
              checked={imageScale === 1}
              onChange={() => setImageScale(1)}
            />
            Medium
          </label>
          <label>
            <input
              type="radio"
              name="spsImageScale"
              value="2"
              checked={imageScale === 2}
              onChange={() => setImageScale(2)}
            />
            Large
          </label>
        </div>
        <div className={styles.settingsGroup}>
          <span className={styles.settingsLabel}>Download All:</span>
          <button
            className={styles.downloadButton}
            onClick={() => selectedVisitId && downloadAllSpsExposures(selectedVisitId, exposures, 'raw')}
            disabled={selectedVisitId === null}
          >
            Raw FITS
          </button>
          <button
            className={styles.downloadButton}
            onClick={() => selectedVisitId && downloadAllSpsExposures(selectedVisitId, exposures, 'postISRCCD')}
            disabled={selectedVisitId === null}
          >
            postISRCCD FITS
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.scrollable}>
          <table className={styles.exposureTable}>
            <thead>
              <tr>
                <th></th>
                {modules.map(m => (
                  <th key={m}>SM{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {arms.map(arm => {
                if (!hasData(arm)) return null
                return (
                  <tr key={arm}>
                    <th className={styles.armCell}>{arm.toUpperCase()}</th>
                    {modules.map(module => {
                      const exp = exposureGrid[arm]?.[module]
                      return (
                        <td key={module} className={exp ? styles.previewCell : styles.emptyCell}>
                          {exp && selectedVisitId !== null && (
                            <div className={styles.previewContainer}>
                              <LazyImage
                                src={getSpsPreviewUrl(selectedVisitId, exp.camera_id, imageType, imageScale)}
                                alt={`SPS ${arm}${module}`}
                                skeletonWidth={previewSize.width}
                                skeletonHeight={previewSize.height}
                              />
                              <div className={styles.previewInfo}>
                                <span>#{exp.camera_id}</span>
                                <span>{exp.exptime?.toFixed(1)}s</span>
                              </div>
                              <div className={styles.previewActions}>
                                <IconButton
                                  icon="view_column"
                                  tooltip="Show FITS Header"
                                  className={selectedFitsId?.type === 'sps' && selectedFitsId?.cameraId === exp.camera_id ? styles.selected : ''}
                                  onClick={() => setSelectedFitsId({
                                    type: 'sps',
                                    visitId: selectedVisitId,
                                    cameraId: exp.camera_id,
                                  })}
                                />
                                <IconButton
                                  icon="visibility"
                                  tooltip="Open Large Preview"
                                  onClick={() => window.open(getSpsLargePreviewUrl(selectedVisitId, exp.camera_id, imageType))}
                                />
                                <IconButton
                                  icon="download"
                                  tooltip="Download Raw FITS"
                                  onClick={() => { location.href = getSpsFitsDownloadUrl(selectedVisitId, exp.camera_id, 'raw') }}
                                />
                                <IconButton
                                  icon="download"
                                  tooltip="Download postISRCCD FITS"
                                  onClick={() => { location.href = getSpsFitsDownloadUrl(selectedVisitId, exp.camera_id, 'postISRCCD') }}
                                />
                              </div>
                            </div>
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
    </div>
  )
}
