import {
  useGetSpsFitsHeadersApiFitsVisitsVisitIdSpsCameraIdHeadersGetQuery,
  useGetMcsFitsHeadersApiFitsVisitsVisitIdMcsFrameIdHeadersGetQuery,
} from '../../../store/api/generatedApi'
import { FitsHeaderInfo } from '../../../components/FitsHeaderInfo'
import { LoadingSpinner } from '../../../components/LoadingSpinner'
import { IconButton } from '../../../components/Icon'
import { useVisitDetailContext, type FitsId } from './context'
import styles from './Inspector.module.scss'

interface FitsHeaderPanelProps {
  fitsId: FitsId
}

function SpsFitsHeader({ visitId, cameraId }: { visitId: number; cameraId: number }) {
  const { data, isLoading, error } = useGetSpsFitsHeadersApiFitsVisitsVisitIdSpsCameraIdHeadersGetQuery({
    visitId,
    cameraId,
  })

  if (isLoading) {
    return (
      <div className={styles.headerLoading}>
        <LoadingSpinner size="medium" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={styles.headerError}>
        Failed to load FITS headers
      </div>
    )
  }

  return <FitsHeaderInfo meta={data} />
}

function McsFitsHeader({ visitId, frameId }: { visitId: number; frameId: number }) {
  const { data, isLoading, error } = useGetMcsFitsHeadersApiFitsVisitsVisitIdMcsFrameIdHeadersGetQuery({
    visitId,
    frameId,
  })

  if (isLoading) {
    return (
      <div className={styles.headerLoading}>
        <LoadingSpinner size="medium" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={styles.headerError}>
        Failed to load FITS headers
      </div>
    )
  }

  return <FitsHeaderInfo meta={data} />
}

// Note: AGC FITS headers API is not available in the backend yet
// When implemented, add AgcFitsHeader component similarly

function FitsHeaderContent({ fitsId }: FitsHeaderPanelProps) {
  switch (fitsId.type) {
    case 'sps':
      return <SpsFitsHeader visitId={fitsId.visitId} cameraId={fitsId.fitsId} />
    case 'mcs':
      return <McsFitsHeader visitId={fitsId.visitId} frameId={fitsId.fitsId} />
    case 'agc':
      // AGC FITS headers API not yet implemented
      return (
        <div className={styles.headerError}>
          AGC FITS headers not available
        </div>
      )
    default:
      return null
  }
}

export function FitsHeaderPanel() {
  const { fitsId, setFitsId } = useVisitDetailContext()

  if (!fitsId) {
    return (
      <div className={styles.headerPlaceholder}>
        <p>Select a FITS file to view headers</p>
        <p className={styles.headerHint}>
          Click the <span className={styles.headerIcon}>view_column</span> icon on an exposure
        </p>
      </div>
    )
  }

  const getTitle = () => {
    switch (fitsId.type) {
      case 'sps':
        return `SPS Camera ${fitsId.fitsId}`
      case 'mcs':
        return `MCS Frame ${fitsId.fitsId}`
      case 'agc':
        return `AGC Exposure ${fitsId.fitsId}`
    }
  }

  return (
    <div className={styles.headerPanel}>
      <div className={styles.headerPanelTitle}>
        <span>{getTitle()}</span>
        <IconButton
          icon="close"
          tooltip="Close"
          onClick={() => setFitsId(null)}
        />
      </div>
      <div className={styles.headerPanelContent}>
        <FitsHeaderContent fitsId={fitsId} />
      </div>
    </div>
  )
}
