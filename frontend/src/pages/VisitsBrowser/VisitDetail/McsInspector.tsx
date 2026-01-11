import { useMemo, useState } from 'react'
import type { McsVisitDetail, McsExposure } from '../../../store/api/generatedApi'
import { LazyImage } from '../../../components/LazyImage'
import { IconButton } from '../../../components/Icon'
import { useTheme, type Theme } from '../../../components/Theme'
import { API_BASE_URL } from '../../../config'
import { useVisitsBrowserContext } from '../context'
import { useVisitDetailContext } from './context'
import styles from './Inspector.module.scss'

type ImageScale = 0.75 | 1 | 2

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

/** MCS Plot画像のサイズ */
const PLOT_SIZE = { width: 300, height: 214 }
/** MCS Raw画像のサイズ */
const RAW_SIZE = { width: 332, height: 214 }

function getMcsPlotUrl(frameId: number, scale: ImageScale, theme: Theme): string {
  const params = new URLSearchParams({
    width: String(Math.floor(scale * PLOT_SIZE.width)),
    height: String(Math.floor(scale * PLOT_SIZE.height)),
    theme,
  })
  return `${API_BASE_URL}/api/mcs_data/${frameId}.png?${params}`
}

function getMcsRawUrl(visitId: number, frameId: number, scale: ImageScale): string {
  const params = new URLSearchParams({
    width: String(Math.floor(scale * RAW_SIZE.width)),
    height: String(Math.floor(scale * RAW_SIZE.height)),
  })
  return `${API_BASE_URL}/api/fits/visits/${visitId}/mcs/${frameId}.png?${params}`
}

function getMcsLargePreviewUrl(visitId: number, frameId: number): string {
  return `${API_BASE_URL}/api/fits/visits/${visitId}/mcs/${frameId}.png`
}

function getMcsFitsDownloadUrl(visitId: number, frameId: number): string {
  return `${API_BASE_URL}/api/fits/visits/${visitId}/mcs/${frameId}.fits`
}

export function McsInspector({ mcs }: McsInspectorProps) {
  const { selectedVisitId } = useVisitsBrowserContext()
  const { selectedFitsId, setSelectedFitsId } = useVisitDetailContext()
  const { theme } = useTheme()
  const exposures = useMemo(() => mcs.exposures ?? [], [mcs.exposures])
  const avgExptime = useMemo(() => calculateAverageExptime(exposures), [exposures])

  const [showPlot, setShowPlot] = useState(true)
  const [showRaw, setShowRaw] = useState(false)
  const [imageScale, setImageScale] = useState<ImageScale>(1)

  const plotSize = {
    width: Math.floor(imageScale * PLOT_SIZE.width),
    height: Math.floor(imageScale * PLOT_SIZE.height),
  }
  const rawSize = {
    width: Math.floor(imageScale * RAW_SIZE.width),
    height: Math.floor(imageScale * RAW_SIZE.height),
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
      </div>

      <div className={styles.settings}>
        <div className={styles.settingsGroup}>
          <span className={styles.settingsLabel}>Image Type:</span>
          <label>
            <input
              type="checkbox"
              checked={showPlot}
              onChange={(e) => setShowPlot(e.target.checked)}
            />
            Plot
          </label>
          <label>
            <input
              type="checkbox"
              checked={showRaw}
              onChange={(e) => setShowRaw(e.target.checked)}
            />
            Raw
          </label>
        </div>
        <div className={styles.settingsGroup}>
          <span className={styles.settingsLabel}>Image Size:</span>
          <label>
            <input
              type="radio"
              name="mcsImageScale"
              value="0.75"
              checked={imageScale === 0.75}
              onChange={() => setImageScale(0.75)}
            />
            Small
          </label>
          <label>
            <input
              type="radio"
              name="mcsImageScale"
              value="1"
              checked={imageScale === 1}
              onChange={() => setImageScale(1)}
            />
            Medium
          </label>
          <label>
            <input
              type="radio"
              name="mcsImageScale"
              value="2"
              checked={imageScale === 2}
              onChange={() => setImageScale(2)}
            />
            Large
          </label>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.exposureList}>
          {exposures.map(exp => (
            <McsExposureCard
              key={exp.frame_id}
              exposure={exp}
              visitId={selectedVisitId!}
              showPlot={showPlot}
              showRaw={showRaw}
              plotSize={plotSize}
              rawSize={rawSize}
              scale={imageScale}
              theme={theme}
              isSelected={selectedFitsId?.type === 'mcs' && selectedFitsId?.frameId === exp.frame_id}
              onShowHeader={() => setSelectedFitsId({
                type: 'mcs',
                visitId: selectedVisitId!,
                frameId: exp.frame_id,
              })}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface McsExposureCardProps {
  exposure: McsExposure
  visitId: number
  showPlot: boolean
  showRaw: boolean
  plotSize: { width: number; height: number }
  rawSize: { width: number; height: number }
  scale: ImageScale
  theme: Theme
  isSelected: boolean
  onShowHeader: () => void
}

function McsExposureCard({
  exposure,
  visitId,
  showPlot,
  showRaw,
  plotSize,
  rawSize,
  scale,
  theme,
  isSelected,
  onShowHeader,
}: McsExposureCardProps) {
  return (
    <div className={styles.exposureCard}>
      <div className={styles.exposureCardHeader}>
        Frame ID = {exposure.frame_id}
      </div>
      <div className={styles.exposureCardImages}>
        {showPlot && (
          <LazyImage
            src={getMcsPlotUrl(exposure.frame_id, scale, theme)}
            alt={`MCS Plot ${exposure.frame_id}`}
            skeletonWidth={plotSize.width}
            skeletonHeight={plotSize.height}
            transparentBackground
          />
        )}
        {showRaw && (
          <LazyImage
            src={getMcsRawUrl(visitId, exposure.frame_id, scale)}
            alt={`MCS Raw ${exposure.frame_id}`}
            skeletonWidth={rawSize.width}
            skeletonHeight={rawSize.height}
          />
        )}
      </div>
      <div className={styles.exposureCardInfo}>
        <span>Exptime: {exposure.exptime?.toFixed(3) ?? '-'}s</span>
        <span>Alt: {exposure.altitude?.toFixed(2) ?? '-'}°</span>
        <span>Az: {exposure.azimuth?.toFixed(2) ?? '-'}°</span>
      </div>
      <div className={styles.exposureCardActions}>
        <IconButton
          icon="view_column"
          tooltip="Show FITS Header"
          className={isSelected ? styles.selected : ''}
          onClick={onShowHeader}
        />
        <IconButton
          icon="visibility"
          tooltip="Open Large Preview"
          onClick={() => window.open(getMcsLargePreviewUrl(visitId, exposure.frame_id))}
        />
        <IconButton
          icon="download"
          tooltip="Download FITS File"
          onClick={() => { location.href = getMcsFitsDownloadUrl(visitId, exposure.frame_id) }}
        />
      </div>
    </div>
  )
}
