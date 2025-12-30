import type { MaterialSymbol } from 'material-symbols'
import styles from './Icon.module.scss'

export interface IconProps {
  /** Material Symbols icon name (type-safe) */
  name: MaterialSymbol
  /** Size in pixels (default: 24) */
  size?: number
  /** Whether the icon should be filled */
  fill?: boolean
  /** Additional CSS class */
  className?: string
}

/**
 * Material Symbols icon component
 * @see https://fonts.google.com/icons
 */
export function Icon({ name, size = 24, fill = false, className = '' }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined ${styles.icon} ${className}`}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}`,
      }}
    >
      {name}
    </span>
  )
}
