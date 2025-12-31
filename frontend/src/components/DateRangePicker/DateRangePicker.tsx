import { useEffect, useRef, useCallback, type ReactNode } from 'react'
// @ts-expect-error vanillajs-datepicker has no type definitions
import { DateRangePicker as VanillaDateRangePicker } from 'vanillajs-datepicker'
import './DateRangePicker.scss'

export type DateRange = [string | undefined, string | undefined]

const defaultOptions = {
  format: 'yyyy-mm-dd',
  autohide: true,
  clearBtn: true,
  todayBtn: true,
  todayHighlight: true,
  allowOneSidedRange: true,
}

interface DateRangePickerProps {
  value: DateRange
  onChange?: (value: DateRange) => void
  className?: string
  children?: (startInput: ReactNode, endInput: ReactNode) => ReactNode
}

/**
 * Date range picker component using vanillajs-datepicker
 */
export function DateRangePicker({
  value,
  onChange,
  className,
  children,
}: DateRangePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<VanillaDateRangePicker | null>(null)

  // Initialize the date range picker
  useEffect(() => {
    if (!rootRef.current || !startRef.current || !endRef.current) return

    const picker = new VanillaDateRangePicker(rootRef.current, {
      ...defaultOptions,
      inputs: [startRef.current, endRef.current],
    })
    pickerRef.current = picker

    return () => {
      picker.destroy()
      pickerRef.current = null
    }
  }, [])

  // Sync value when cleared externally
  useEffect(() => {
    if (pickerRef.current && value[0] === undefined && value[1] === undefined) {
      pickerRef.current.setDates({ clear: true }, { clear: true })
    }
  }, [value])

  const handleStartChange = useCallback(
    (e: Event) => {
      const target = e.target as HTMLInputElement
      onChange?.([target.value || undefined, value[1]])
    },
    [onChange, value]
  )

  const handleEndChange = useCallback(
    (e: Event) => {
      const target = e.target as HTMLInputElement
      onChange?.([value[0], target.value || undefined])
    },
    [onChange, value]
  )

  // Attach changeDate event listeners
  useEffect(() => {
    const startEl = startRef.current
    const endEl = endRef.current
    if (!startEl || !endEl) return

    startEl.addEventListener('changeDate', handleStartChange)
    endEl.addEventListener('changeDate', handleEndChange)

    return () => {
      startEl.removeEventListener('changeDate', handleStartChange)
      endEl.removeEventListener('changeDate', handleEndChange)
    }
  }, [handleStartChange, handleEndChange])

  const startInput = (
    <input
      ref={startRef}
      type="text"
      defaultValue={value[0] || ''}
      placeholder="Start date"
      readOnly
    />
  )

  const endInput = (
    <input
      ref={endRef}
      type="text"
      defaultValue={value[1] || ''}
      placeholder="End date"
      readOnly
    />
  )

  return (
    <div ref={rootRef} className={className}>
      {children ? children(startInput, endInput) : (
        <>
          {startInput}
          <span> – </span>
          {endInput}
        </>
      )}
    </div>
  )
}
