import { LoadingSpinner } from '../LoadingSpinner'
import styles from './LoadingOverlay.module.scss'

interface LoadingOverlayProps {
  /** Whether the overlay is visible */
  isLoading: boolean
  /** Size of the spinner (default: 64) */
  size?: number
  /** Whether to show "Loading..." text (default: false) */
  showText?: boolean
  /** Whether to cover the full viewport (default: false, covers parent container) */
  fullScreen?: boolean
}

/**
 * Loading overlay component that covers its parent container or the full viewport.
 * Use this to indicate loading state while blocking user interaction.
 * 
 * @example
 * // Relative to parent container (parent needs position: relative)
 * <div style={{ position: 'relative' }}>
 *   <LoadingOverlay isLoading={isFetching} />
 *   <YourContent />
 * </div>
 * 
 * @example
 * // Full screen overlay
 * <LoadingOverlay isLoading={isLoading} fullScreen />
 */
export function LoadingOverlay({
  isLoading,
  size = 64,
  showText = false,
  fullScreen = false,
}: LoadingOverlayProps) {
  if (!isLoading) return null

  return (
    <div className={`${styles.overlay} ${fullScreen ? styles.fullScreen : ''}`}>
      <LoadingSpinner size={size} showText={showText} />
    </div>
  )
}
