export function useDragSelect() {
  let mouseState: 'up' | 'down' = 'up'
  let mouseDevice = false
  const mousedownStart = (e: MouseEvent) => {
    mouseDevice = true
    e.stopPropagation()
    mouseState = 'down'
    document.addEventListener('mouseup', () => mouseState = 'up', { once: true })
  }
  const element = (onSelect: () => void, slot: JSX.Element) => {
    return (
      <div
        onMouseenter={e => {
          e.stopPropagation()
          if (mouseState == 'down' &&
            // @ts-ignore
            !e.relatedTarget.matches('.block')
            // Spinner's block element triggers mouseenter
          ) {
            onSelect()
          }
        }}
        onMousedown={e => {
          e.stopPropagation()
          mousedownStart(e)
          onSelect()
        }}
        onClick={e => {
          e.stopPropagation()
          mouseDevice || onSelect()
        }}
      >
        {slot}
      </div>
    )
  }
  return { mousedownStart, element }
}
