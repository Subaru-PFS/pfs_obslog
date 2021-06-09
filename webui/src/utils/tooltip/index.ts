import style from './style.module.scss'


document.addEventListener('mouseenter', eOver => {
  const target = eOver.target as HTMLElement | null
  const tooltipContent = target?.dataset?.tooltip
  if (tooltipContent) {
    new Tooltip(target!, tooltipContent)
  }
}, { capture: true })


function on<
  T extends EventTarget,
  U extends Parameters<T["addEventListener"]>[0],
  >(target: T, type: U, cb: (e: Event) => unknown, options?: AddEventListenerOptions) {
  target.addEventListener(type, cb, options)
  return () => {
    target.removeEventListener(type, cb)
  }
}

class Tooltip {
  private el: HTMLDivElement
  private off: (() => void)[] = []

  constructor(private parent: HTMLElement, text: string) {
    this.el = document.createElement('div')
    this.el.classList.add(style.tooltip)
    this.el.appendChild(document.createTextNode(text))
    document.body.appendChild(this.el)
    this.setPosition()

    this.off.push(on(window, 'scroll', () => {
      this.dispose()
    }, { capture: true }))
    this.off.push(on(this.parent, 'mouseleave', () => {
      this.dispose()
    }))
    const observer = new MutationObserver(() => {
      if (!document.body.contains(this.parent)) {
        this.dispose()
      }
    })
    this.off.push(() => {
      observer.disconnect()
    })
    observer.observe(document.body, { childList: true, subtree: true })
  }

  private dispoaseCount = 0

  dispose() {
    if (this.dispoaseCount++ == 0) {
      while (this.off.length > 0) {
        this.off.pop()!()
      }
      this.el.parentElement?.removeChild(this.el)
    }
  }

  private setPosition() {
    const windowRect = Rect.fromDomRect({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight })
    const parentRect = Rect.fromDomRect(this.parent.getBoundingClientRect())
    const { width, height } = this.el.getBoundingClientRect()
    const elRect0 = new Rect(
      parentRect.centerX,
      parentRect.centerY,
      width, height,
    )
    let elRect: Rect
    const W = (parentRect.width + width) / 2
    const w = (parentRect.width - width) / 2
    const H = (parentRect.height + height) / 2
    // const h = (parentRect.height - height) / 2
    for (const [dx, dy] of [
      [0, +H],
      [-w, +H],
      [+w, +H],
      [0, -H],
      [-w, -H],
      [+w, -H],
      [+W, 0],
      [-W, 0],
    ] as [number, number][]) {
      elRect = elRect0.shift(dx, dy)
      if (!elRect.overflowsOn(windowRect)) {
        break
      }
    }
    this.el.style.top = `${elRect!.top}px`
    this.el.style.left = `${elRect!.left}px`
  }
}

class Rect {
  constructor(
    readonly centerX: number,
    readonly centerY: number,
    readonly width: number,
    readonly height: number,
  ) { }

  static fromDomRect(
    { left, top, width, height }: { left: number, top: number, width: number, height: number },
    override?: { centerX: number, centerY: number },
  ) {
    return new this(
      override?.centerX || (left + width / 2),
      override?.centerY || (top + height / 2),
      width, height,
    )
  }

  get left() {
    return this.centerX - this.width / 2
  }
  get right() {
    return this.centerX + this.width / 2
  }
  get top() {
    return this.centerY - this.height / 2
  }
  get bottom() {
    return this.centerY + this.height / 2
  }

  overflowsOn(other: Rect) {
    return this.left < other.left || this.top < other.top ||
      this.right > other.right || this.bottom > other.bottom
  }

  shift(dx: number, dy: number) {
    return new Rect(
      this.centerX + dx,
      this.centerY + dy,
      this.width, this.height)
  }
}
