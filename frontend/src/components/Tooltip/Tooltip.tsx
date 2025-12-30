import { type ReactNode, useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import styles from './Tooltip.module.scss'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

/**
 * Tooltip component that displays content on hover.
 * Uses portal to render tooltip at document body level to avoid overflow issues.
 *
 * @example
 * <Tooltip content="Click to submit">
 *   <button>Submit</button>
 * </Tooltip>
 */
export function Tooltip({
  content,
  children,
  placement = 'bottom',
  delay = 200,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<number | null>(null)

  const showTooltip = useCallback(() => {
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }, [delay])

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsVisible(false)
  }, [])

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const tooltipRect = tooltipRef.current?.getBoundingClientRect()
      const tooltipWidth = tooltipRect?.width ?? 0
      const tooltipHeight = tooltipRect?.height ?? 0

      let top = 0
      let left = 0

      switch (placement) {
        case 'top':
          top = rect.top - tooltipHeight - 8
          left = rect.left + rect.width / 2 - tooltipWidth / 2
          break
        case 'bottom':
          top = rect.bottom + 8
          left = rect.left + rect.width / 2 - tooltipWidth / 2
          break
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2
          left = rect.left - tooltipWidth - 8
          break
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2
          left = rect.right + 8
          break
      }

      // Keep tooltip within viewport
      const padding = 8
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding))
      top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding))

      setPosition({ top, left })
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isVisible, placement])

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className={styles.trigger}
      >
        {children}
      </span>
      {isVisible &&
        content &&
        createPortal(
          <div
            ref={tooltipRef}
            className={`${styles.tooltip} ${styles[placement]}`}
            style={{ top: position.top, left: position.left }}
            role="tooltip"
          >
            {content}
            <div className={styles.arrow} />
          </div>,
          document.body
        )}
    </>
  )
}
