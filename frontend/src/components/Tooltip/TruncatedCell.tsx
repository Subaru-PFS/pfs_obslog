import { type ReactNode, useState, useRef, useCallback } from 'react'
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  arrow,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  FloatingArrow,
  type Placement,
} from '@floating-ui/react'
import styles from './Tooltip.module.scss'

type TruncatedCellProps = {
  /** The tooltip content to display when text is truncated */
  content: ReactNode
  /** The cell content (text to display) */
  children: ReactNode
  /** Tooltip placement */
  placement?: Placement
  /** Delay before showing tooltip (ms) */
  delay?: number
  /** Additional CSS class */
  className?: string
}

const ARROW_HEIGHT = 6
const ARROW_WIDTH = 12

/**
 * A table cell (td) that shows a tooltip only when content is truncated.
 * Uses CSS text-overflow: ellipsis detection to determine if truncated.
 *
 * @example
 * <TruncatedCell content={visit.description}>
 *   {visit.description || '-'}
 * </TruncatedCell>
 */
export function TruncatedCell({
  content,
  children,
  placement = 'bottom',
  delay = 300,
  className,
}: TruncatedCellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isTruncated, setIsTruncated] = useState(false)
  const arrowRef = useRef<SVGSVGElement>(null)
  const cellRef = useRef<HTMLTableCellElement | null>(null)

  // Check if content is truncated
  const checkTruncation = useCallback(() => {
    if (cellRef.current) {
      const { scrollWidth, clientWidth } = cellRef.current
      setIsTruncated(scrollWidth > clientWidth)
    }
  }, [])

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    middleware: [
      offset(ARROW_HEIGHT + 2),
      flip({ fallbackAxisSideDirection: 'start' }),
      shift({ padding: 8 }),
      arrow({ element: arrowRef }),
    ],
    whileElementsMounted: autoUpdate,
  })

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

  // Set both refs
  const setRefs = useCallback(
    (node: HTMLTableCellElement | null) => {
      cellRef.current = node
      refs.setReference(node)
    },
    [refs]
  )

  // Only show tooltip if content is truncated and has content
  const shouldShowTooltip = isOpen && isTruncated && content

  return (
    <>
      <td
        ref={setRefs}
        className={className}
        {...getReferenceProps({
          onMouseEnter: checkTruncation,
        })}
      >
        {children}
      </td>
      {shouldShowTooltip && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className={styles.tooltip}
          >
            {content}
            <FloatingArrow
              ref={arrowRef}
              context={context}
              width={ARROW_WIDTH}
              height={ARROW_HEIGHT}
              className={styles.arrow}
            />
          </div>
        </FloatingPortal>
      )}
    </>
  )
}
