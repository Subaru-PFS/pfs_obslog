import { type ReactNode, useState, useRef, useCallback } from 'react'
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  type Placement,
} from '@floating-ui/react'
import styles from './Tooltip.module.scss'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  placement?: Placement
  delay?: number
}

/**
 * Tooltip component that displays content on hover.
 * Uses floating-ui for automatic positioning and viewport boundary handling.
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
  delay = 0,
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const timeoutRef = useRef<number | null>(null)

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    middleware: [
      offset(8),
      flip({ fallbackAxisSideDirection: 'start' }),
      shift({ padding: 8 }),
    ],
    whileElementsMounted: autoUpdate,
  })

  const showTooltip = useCallback(() => {
    if (delay > 0) {
      timeoutRef.current = window.setTimeout(() => {
        setIsOpen(true)
      }, delay)
    } else {
      setIsOpen(true)
    }
  }, [delay])

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsOpen(false)
  }, [])

  const hover = useHover(context, {
    delay: delay > 0 ? { open: delay, close: 0 } : undefined,
  })
  const focus = useFocus(context)
  const dismiss = useDismiss(context)
  const role = useRole(context, { role: 'tooltip' })

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ])

  return (
    <>
      <span
        ref={refs.setReference}
        {...getReferenceProps({
          onMouseEnter: showTooltip,
          onMouseLeave: hideTooltip,
          onFocus: showTooltip,
          onBlur: hideTooltip,
        })}
        className={styles.trigger}
      >
        {children}
      </span>
      {isOpen && content && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className={styles.tooltip}
          >
            {content}
          </div>
        </FloatingPortal>
      )}
    </>
  )
}
