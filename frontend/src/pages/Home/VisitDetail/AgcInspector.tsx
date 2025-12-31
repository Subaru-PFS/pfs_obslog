import { useMemo, useState, useRef, useEffect } from 'react'
import type { AgcVisitDetail, AgcExposure } from '../../../store/api/generatedApi'
import { LazyImage } from '../../../components/LazyImage'
import { IconButton } from '../../../components/Icon'
import { API_BASE_URL } from '../../../config'
import { useHomeContext } from '../context'
import styles from './Inspector.module.scss'

type ImageScale = 0.5 | 0.67 | 1

interface AgcInspectorProps {
  agc: AgcVisitDetail
}

const PER_PAGE = 20
const CAMERA_COUNT = 6

/** AGC画像のサイズ */
const CAMERA_SIZE = { width: 358, height: 345 }

/**
 * 平均露出時間を計算
 */
function calculateAverageExptime(exposures: AgcExposure[]): number {
  const exptimes = exposures.map(e => e.exptime).filter((t): t is number => t !== null && t !== undefined)
  if (exptimes.length === 0) return 0
  return exptimes.reduce((a, b) => a + b, 0) / exptimes.length
}

function getAgcPreviewUrl(visitId: number, exposureId: number, hduIndex: number, scale: ImageScale): string {
  const params = new URLSearchParams({
    width: String(Math.floor(scale * CAMERA_SIZE.width)),
    height: String(Math.floor(scale * CAMERA_SIZE.height)),
  })
  return `${API_BASE_URL}/api/fits/visits/${visitId}/agc/${exposureId}/${hduIndex}.png?${params}`
}

function getAgcLargePreviewUrl(visitId: number, exposureId: number, hduIndex: number): string {
  return `${API_BASE_URL}/api/fits/visits/${visitId}/agc/${exposureId}/${hduIndex}.png`
}

function getAgcFitsDownloadUrl(visitId: number, exposureId: number): string {
  return `${API_BASE_URL}/api/fits/visits/${visitId}/agc/${exposureId}.fits`
}

export function AgcInspector({ agc }: AgcInspectorProps) {
  const { selectedVisitId } = useHomeContext()
  const exposures = agc.exposures ?? []
  const avgExptime = useMemo(() => calculateAverageExptime(exposures), [exposures])
  const [page, setPage] = useState(0)
  const [imageScale, setImageScale] = useState<ImageScale>(0.67)
  const scrollRef = useRef<HTMLDivElement>(null)

  const totalPages = Math.ceil(exposures.length / PER_PAGE)
  const pagedExposures = useMemo(
    () => exposures.slice(page * PER_PAGE, (page + 1) * PER_PAGE),
    [exposures, page]
  )

  // ページ変更時にスクロール位置をリセット
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, left: 0 })
  }, [page])

  const cameraSize = {
    width: Math.floor(imageScale * CAMERA_SIZE.width),
    height: Math.floor(imageScale * CAMERA_SIZE.height),
  }

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

      <div className={styles.settings}>
        <div className={styles.settingsGroup}>
          <span className={styles.settingsLabel}>Image Size:</span>
          <label>
            <input
              type="radio"
              name="agcImageScale"
              value="0.5"
              checked={imageScale === 0.5}
              onChange={() => setImageScale(0.5)}
            />
            Small
          </label>
          <label>
            <input
              type="radio"
              name="agcImageScale"
              value="0.67"
              checked={imageScale === 0.67}
              onChange={() => setImageScale(0.67)}
            />
            Medium
          </label>
          <label>
            <input
              type="radio"
              name="agcImageScale"
              value="1"
              checked={imageScale === 1}
              onChange={() => setImageScale(1)}
            />
            Large
          </label>
        </div>
      </div>

      <div className={styles.content} ref={scrollRef}>
        <div className={styles.exposureList}>
          {pagedExposures.map(exp => (
            <AgcExposureCard
              key={exp.id}
              exposure={exp}
              visitId={selectedVisitId!}
              cameraSize={cameraSize}
              scale={imageScale}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface AgcExposureCardProps {
  exposure: AgcExposure
  visitId: number
  cameraSize: { width: number; height: number }
  scale: ImageScale
}

function AgcExposureCard({ exposure, visitId, cameraSize, scale }: AgcExposureCardProps) {
  const guideOffset = exposure.guide_offset

  return (
    <div className={styles.exposureCard}>
      <div className={styles.exposureCardHeader}>
        Exposure ID = {exposure.id}
      </div>
      <div className={styles.cameraGrid}>
        {Array.from({ length: CAMERA_COUNT }, (_, i) => i + 1).map(hduIndex => (
          <div key={hduIndex} className={styles.cameraItem}>
            <LazyImage
              src={getAgcPreviewUrl(visitId, exposure.id, hduIndex, scale)}
              alt={`AGC ${exposure.id} HDU ${hduIndex}`}
              skeletonWidth={cameraSize.width}
              skeletonHeight={cameraSize.height}
            />
            <a
              className={styles.cameraLink}
              href={getAgcLargePreviewUrl(visitId, exposure.id, hduIndex)}
              target="_blank"
              rel="noopener noreferrer"
            >
              [{hduIndex}]
            </a>
          </div>
        ))}
      </div>
      <div className={styles.exposureCardInfo}>
        <span>Exptime: {exposure.exptime?.toFixed(3) ?? '-'}s</span>
        <span>Alt: {exposure.altitude?.toFixed(2) ?? '-'}°</span>
        <span>Az: {exposure.azimuth?.toFixed(2) ?? '-'}°</span>
        {guideOffset && (
          <span>
            Guide Offset: ΔRA={guideOffset.delta_ra?.toFixed(3) ?? '-'}, 
            ΔDec={guideOffset.delta_dec?.toFixed(3) ?? '-'}
          </span>
        )}
      </div>
      <div className={styles.exposureCardActions}>
        <IconButton
          icon="download"
          tooltip="Download FITS File"
          onClick={() => { location.href = getAgcFitsDownloadUrl(visitId, exposure.id) }}
        />
      </div>
    </div>
  )
}
