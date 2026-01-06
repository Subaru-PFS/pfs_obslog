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
  /** 
   * Whether to use sticky positioning to stay centered in viewport while scrolling.
   * Useful for scrollable containers. (default: false)
   */
  stickyCenter?: boolean
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
 * 
 * @example
 * // Sticky centered in scrollable container
 * <div style={{ overflow: 'auto' }}>
 *   <LoadingOverlay isLoading={isFetching} stickyCenter />
 *   <YourScrollableContent />
 * </div>
 */
export function LoadingOverlay({
  isLoading,
  size = 64,
  showText = false,
  fullScreen = false,
  stickyCenter = false,
}: LoadingOverlayProps) {
  if (!isLoading) return null

  const classNames = [
    styles.overlay,
    fullScreen ? styles.fullScreen : '',
    stickyCenter ? styles.stickyCenter : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={classNames}>
      <LoadingSpinner size={size} showText={showText} />
    </div>
  )
}
