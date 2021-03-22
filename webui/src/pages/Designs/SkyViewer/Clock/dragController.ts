type SynthesizedPointerEvent = {
  x: number
  y: number
}

type SynthesizedDragEvent = SynthesizedPointerEvent & {
  dx: number
  dy: number
}

export type DragCallbacks = {
  dragStart?: (e: SynthesizedDragEvent) => unknown
  drag?: (e: SynthesizedDragEvent) => unknown
  dragEnd?: (e: SynthesizedDragEvent) => unknown
}

export function dragController(
  e: SynthesizedPointerEvent,
  callbacks: DragCallbacks) {
  const { dragStart, drag, dragEnd } = callbacks
  let x = e.x
  let y = e.y

  const pointermove = (e: SynthesizedPointerEvent) => {
    const dx = e.x - x
    const dy = e.y - y
    x = e.x
    y = e.y
    drag?.({ ...e, dx, dy })
  }

  const pointerup = (e: SynthesizedPointerEvent) => {
    cleanup()
    const dx = e.x - x
    const dy = e.y - y
    x = e.x
    y = e.y
    dragEnd?.({ ...e, dx, dy })
  }

  const mousemove = (e: MouseEvent) => pointermove(convertMouseEvent(e))
  const touchmove = (e: TouchEvent) => pointermove(convertTouchEvent(e))
  const mouseup = (e: MouseEvent) => pointerup(convertMouseEvent(e))
  const touchend = (e: TouchEvent) => pointerup(convertTouchEvent(e))

  const cleanup = () => {
    document.removeEventListener('touchcancel', cleanup)
    document.removeEventListener('touchend', touchend)
    document.removeEventListener('mouseup', mouseup)
    document.removeEventListener('touchmove', touchmove)
    document.removeEventListener('mousemove', mousemove)
  }

  document.addEventListener('mousemove', mousemove)
  document.addEventListener('touchmove', touchmove)
  document.addEventListener('mouseup', mouseup)
  document.addEventListener('touchend', touchend)
  document.addEventListener('touchcancel', cleanup)

  dragStart?.({ x, y, dx: 0, dy: 0 })
}

export function convertTouchEvent(e: TouchEvent): SynthesizedPointerEvent {
  const { clientX, clientY } = e.touches[0]
  return { x: clientX, y: clientY }
}

export function convertMouseEvent(e: MouseEvent): SynthesizedPointerEvent {
  const { clientX, clientY } = e
  return { x: clientX, y: clientY }
}
