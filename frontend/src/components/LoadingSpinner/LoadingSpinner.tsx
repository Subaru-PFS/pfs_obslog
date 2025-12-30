import styles from './LoadingSpinner.module.scss'

export interface LoadingSpinnerProps {
  /** Size in pixels (default: 32) */
  size?: number
  /** Loading text to display (default: 'Loading...') */
  text?: string
  /** Whether to show the loading text (default: true) */
  showText?: boolean
  /** Additional CSS class */
  className?: string
}

/**
 * Loading spinner component with optional text
 */
export function LoadingSpinner({
  size = 32,
  text = 'Loading...',
  showText = true,
  className = '',
}: LoadingSpinnerProps) {
  return (
    <div className={`${styles.loadingSpinner} ${className}`}>
      <div
        className={styles.spinner}
        style={{
          width: size,
          height: size,
          borderWidth: Math.max(2, size / 10),
        }}
      />
      {showText && <span className={styles.text}>{text}</span>}
    </div>
  )
}
