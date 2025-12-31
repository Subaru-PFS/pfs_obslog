import type { MaterialSymbol } from 'material-symbols'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon } from './Icon'
import { Tooltip } from '../Tooltip'
import styles from './Icon.module.scss'

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Material Symbols icon name */
  icon: MaterialSymbol
  /** Size in pixels (default: 18) */
  size?: number
  /** Whether the icon should be filled */
  fill?: boolean
  /** Tooltip content */
  tooltip?: ReactNode
}

/**
 * Icon button component with optional tooltip
 *
 * @example
 * <IconButton icon="logout" onClick={handleLogout} tooltip="Logout" />
 */
export function IconButton({
  icon,
  size = 18,
  fill = false,
  tooltip,
  className = '',
  ...buttonProps
}: IconButtonProps) {
  const button = (
    <button
      type="button"
      className={`${styles.iconButton} ${className}`}
      {...buttonProps}
    >
      <Icon name={icon} size={size} fill={fill} />
    </button>
  )

  if (tooltip) {
    return <Tooltip content={tooltip}>{button}</Tooltip>
  }

  return button
}
