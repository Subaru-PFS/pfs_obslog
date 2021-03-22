import { createEffect, createMemo, JSX, on, onCleanup, onMount } from 'solid-js'
// @ts-ignore
import { Datepicker, DateRangePicker } from 'vanillajs-datepicker'
import './styles.scss'


const defaultOptions = {
  format: 'yyyy-mm-dd',
  autohide: true,
  clearBtn: true,
  todayBtn: true,
  todayHighlight: true,
}


type MaybeDate = string | undefined
type DateRange = [MaybeDate, MaybeDate]
type DivProps = JSX.HTMLAttributes<HTMLDivElement>


type DateRangePickerProps = {
  children: (start: JSX.Element, end: JSX.Element) => JSX.Element
  datePickerOptions?: { [key: string]: unknown }
  value: DateRange,
  onChange?: (value: DateRange) => unknown
  class?: DivProps["class"]
}


function DateRangePickerComponent(props: DateRangePickerProps) {
  let startElement: HTMLInputElement | undefined
  let endElement: HTMLInputElement | undefined
  let rootElement: HTMLDivElement | undefined

  onMount(() => {
    const rangeDatePicker = new DateRangePicker(rootElement, {
      ...defaultOptions,
      ...(props.datePickerOptions ?? {}),
      inputs: [startElement, endElement],
    })
    onCleanup(() => {
      rangeDatePicker.destroy()
    })
    createEffect(on(() => props.value, ([start, end]) => {
      if (start === undefined && end === undefined) {
        rangeDatePicker.setDates({ clear: true }, { clear: true })
      }
    }))
  })

  return (
    <div ref={rootElement} class={props.class}>
      {props.children(
        <input
          ref={startElement}
          value={props.value[0] || ''}
          //@ts-ignore
          on:changeDate={(e) => {
            props.onChange?.([e.currentTarget.value || undefined, props.value[1]])
          }}
        />,
        <input
          ref={endElement}
          value={props.value[1] || ''}
          //@ts-ignore
          on:changeDate={(e) => {
            props.onChange?.([props.value[0], e.currentTarget.value || undefined])
          }}
        />,
      )}
    </div>
  )
}


type DatePickerProps = {
  allowNull?: boolean
  datePickerOptions?: { [key: string]: unknown }
  value: MaybeDate,
  onChange?: (value: MaybeDate) => unknown
  size?: number
  inputClass?: string
  inputStyle?: JSX.CSSProperties
}


function DatePickerComponent(props: DatePickerProps) {
  let el: HTMLInputElement | undefined
  const allowNull = createMemo(() => props.allowNull ?? true)

  onMount(() => {
    const datePicker = new Datepicker(el, {
      ...defaultOptions,
      ...(props.datePickerOptions ?? {}),
    })
    onCleanup(() => {
      datePicker.destroy()
    })
  })

  return (
    <input
      class={props.inputClass}
      style={props.inputStyle}
      size={props.size}
      ref={el}
      value={props.value}
      //@ts-ignore
      on:changeDate={e => {
        const newValue = e.currentTarget.value as string
        if (newValue === '') {
          if (allowNull()) {
            props.onChange?.(newValue)
          }
          else {
            e.currentTarget.value = props.value
          }
        } else {
          props.onChange?.(newValue)
        }
      }}
    />
  )
}

export {
  DateRangePickerComponent as DateRangePicker,
  DatePickerComponent as DatePicker,
}
