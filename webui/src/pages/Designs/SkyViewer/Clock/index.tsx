import { createEffect, createSignal, mergeProps } from "solid-js"
import { convertMouseEvent, convertTouchEvent, DragCallbacks, dragController } from "./dragController"
import { ClockStyle, drawClock } from "./drawClock"
import styles from './styles.module.scss'

type ClockProps = {
  size?: number
  clockStyle?: ClockStyle
  hour?: number
  minute?: number
  second?: number
  onScrew?: (angle: number) => unknown
}

function defaultProps() {
  return {
    size: 120,
  }
}

export function Clock(_props: ClockProps) {
  const props = mergeProps(_props, defaultProps())
  let canvas: HTMLCanvasElement | undefined

  const [cursor, setCursor] = createSignal('grab')

  createEffect(() => {
    const ctx = canvas!.getContext('2d')!
    const { hour, minute, second } = props
    drawClock(ctx, { style: props.clockStyle, hour, minute, second })
  })

  const clockCenter = () => {
    const { left, top, width, height } = canvas?.getBoundingClientRect()!
    return [left + width / 2, top + height / 2] as [number, number]
  }

  const dragCallbacks: DragCallbacks = {
    drag: e => {
      const [ox, oy] = clockCenter()
      const { dx, dy } = e
      const x1 = e.x - ox
      const y1 = e.y - oy
      const x2 = x1 + dx
      const y2 = y1 + dy
      const det = x1 * y2 - x2 * y1
      const sine = det / Math.sqrt((x1 ** 2 + y1 ** 2) * (x2 ** 2 + y2 ** 2))
      props.onScrew?.(sine)
    },
    dragStart: () => {
      setCursor('grabbing')
    },
    dragEnd: () => {
      setCursor('grab')
    },
  }

  const onKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        props.onScrew?.(2 * Math.PI / (12 * 60))
        break
      case 'ArrowDown':
        props.onScrew?.(-2 * Math.PI / (12 * 60))
        break
    }
  }

  return (
    <canvas
      tabindex={0}
      class={styles.clock}
      style={{ width: `${props.size}px`, height: `${props.size}px`, cursor: cursor() }}
      width={props.size * window.devicePixelRatio}
      height={props.size * window.devicePixelRatio}
      ref={canvas}
      onMouseDown={e => dragController(convertMouseEvent(e), dragCallbacks)}
      onTouchStart={e => dragController(convertTouchEvent(e), dragCallbacks)}
      onKeyDown={onKeyDown}
    />
  )
}


