import { createEffect, createMemo, mergeProps, on } from 'solid-js'
import { KdTree } from '~/utils/kd_tree'
import { range } from '~/utils/range'
import { Relative } from '../layout'
import cobId2fiberId from './cobId2fiberId.json'
import styles from './styles.module.scss'


type FocalPlaneProps = {
  size?: number
  colorFunc: (cobra: Cobra) => string
  onPointerEnter?: (cobra?: Cobra) => void
  refreshSignal: () => unknown,
}


export function FocalPlane(_props: FocalPlaneProps) {
  const props = mergeProps({
    size: 800,
  }, _props)

  let baseCanvas: HTMLCanvasElement | undefined
  let focusCanvas: HTMLCanvasElement | undefined
  let viewport: DOMMatrix

  createEffect(on([props.refreshSignal], () => {
    const ctx = baseCanvas?.getContext('2d')!
    viewport = drawFocalPlaneBase(ctx, props.colorFunc)
  }))

  const size = createMemo(() => {
    const w = 2 * Math.ceil(0.5 * window.devicePixelRatio * props.size * (Math.sqrt(3) / 2))
    const h = 2 * Math.ceil(0.5 * window.devicePixelRatio * props.size)
    return { w, h }
  })

  const cssSize = createMemo(() => ({
    width: `${Math.floor(size().w / window.devicePixelRatio)}px`,
    height: `${Math.floor(size().h / window.devicePixelRatio)}px`,
  }))

  const index = buildCobraPositionIndex()

  const onMouseMove = (e: { clientX: number, clientY: number }) => {
    const [x, y] = clientCoord2FocalCoord(e)
    const [nearest] = index.nearest([x, y], 1, 2)
    props.onPointerEnter?.(nearest)
    showFocusedCobra(nearest)
  }

  let lastFocalCobra: Cobra | undefined
  const showFocusedCobra = (cobra?: Cobra) => {
    if (cobra !== lastFocalCobra) {
      drawFocalPlaneFocus(
        focusCanvas?.getContext('2d')!,
        cobra,
      )
    }
    lastFocalCobra = cobra
  }

  const clientCoord2FocalCoord = (e: { clientX: number, clientY: number }): [number, number] => {
    const { clientX, clientY } = e
    const { left: ox, top: oy } = baseCanvas?.getBoundingClientRect()!
    const x = (clientX - ox) * window.devicePixelRatio
    const y = (clientY - oy) * window.devicePixelRatio
    const p = viewport.inverse().transformPoint(new DOMPoint(x, y))
    return [p.x, p.y]
  }

  return (
    <Relative
      style={cssSize()}
      onMouseMove={onMouseMove}
      onTouchMove={e => onMouseMove(convertTouchEventToMouseEvent(e))}
      onMouseLeave={() => {
        showFocusedCobra(undefined)
        props.onPointerEnter?.(undefined)
      }}
    >
      <canvas
        style={cssSize()}
        class={styles.baseCanvas}
        ref={baseCanvas}
        width={size().w}
        height={size().h}
      />
      <canvas
        style={cssSize()}
        class={styles.focusCanvas}
        ref={focusCanvas}
        width={size().w}
        height={size().h}
      />
    </Relative>
  )
}


function setFocalPlaneViewport(ctx: CanvasRenderingContext2D, cb: () => unknown) {
  const { width, height } = ctx.canvas
  ctx.save()
  ctx.translate(width / 2, height / 2)
  ctx.scale(height, height)
  ctx.scale(1 / (58 * 2), 1 / (58 * 2))
  cb()
  ctx.restore()
}


function drawFocalPlaneFocus(
  ctx: CanvasRenderingContext2D,
  cobra: Cobra | undefined,
) {
  const { width, height } = ctx.canvas
  ctx.clearRect(0, 0, width, height)
  if (cobra) {
    setFocalPlaneViewport(ctx, () => {
      ctx.fillStyle = 'transparent'
      ctx.lineWidth = 1
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)'
      ctx.save()
      {
        ctx.translate(cobra.x, cobra.y)
        drawHexagon(ctx, 1.5, 0, true)
      }
      ctx.restore()
    })
  }
}


function drawFocalPlaneBase(
  ctx: CanvasRenderingContext2D,
  colorFunc: (cobra: Cobra) => string,
) {
  const { width, height } = ctx.canvas
  ctx.clearRect(0, 0, width, height)
  let viewport: DOMMatrix
  setFocalPlaneViewport(ctx, () => {
    ctx.fillStyle = '#777'
    drawHexagon(ctx, 58, 0.5)
    for (let id0 = 0; id0 < NUM_OF_COBRAS; ++id0) {
      const cobra = new Cobra(id0)
      ctx.fillStyle = colorFunc(cobra)
      ctx.save()
      {
        ctx.translate(cobra.x, cobra.y)
        drawHexagon(ctx, 1)
      }
      ctx.restore()
    }
    viewport = ctx.getTransform()
  })
  return viewport!
}


function drawHexagon(ctx: CanvasRenderingContext2D, radius: number, phase = 0, stroke = false) {
  ctx.beginPath()
  for (const [x, y] of regularPolygonCoords(6, 1, phase)) {
    ctx.lineTo(radius * x, radius * y)
  }
  ctx.closePath()
  ctx.fill()
  if (stroke) {
    ctx.stroke()
  }
}


function regularPolygonCoords(n: number, radius: number, phase = 0) {
  return range(n).map((i): [number, number] => {
    return [
      radius * Math.cos((i + phase) / n * 2 * Math.PI),
      radius * Math.sin((i + phase) / n * 2 * Math.PI),
    ]
  })
}


const NUM_MODULES_PER_SECTOR = 14
const NUM_COBRAS_PER_MODULE = 57
const NUM_OF_FIELDS = 3
const NUM_OF_COBRAS = NUM_OF_FIELDS * NUM_MODULES_PER_SECTOR * NUM_COBRAS_PER_MODULE
// const NUM_OF_MODULES = NUM_MODULES_PER_SECTOR * NUM_OF_FIELDS


// https://github.com/Subaru-PFS/pfs_utils/blob/master/data/fiberids/cobras.pdf
export class Cobra {
  readonly cm0: number // cobra number in module (0 based index)
  readonly m0: number  // module number (0 based index)
  readonly mf0: number // module number in field (0 based index)
  readonly f0: number  // field number (0 based index)
  readonly x: number
  readonly y: number

  constructor(readonly id0: number) {
    this.cm0 = id0 % NUM_COBRAS_PER_MODULE // cobra number in module
    this.m0 = Math.floor(id0 / NUM_COBRAS_PER_MODULE) // module number
    this.mf0 = this.m0 % NUM_MODULES_PER_SECTOR // module number in field
    this.f0 = Math.floor(this.m0 / NUM_MODULES_PER_SECTOR) // field number
    const DELX = Math.sqrt(3)
    const DELY = 1
    const x0 = -DELX * ((this.cm0 % 2 == 0 ? 1 : 2) + 2 * this.mf0)
    const y0 = -DELY * ((this.cm0 - 1) - 2 * this.mf0)
    const [x, y] = rotation(x0, y0, this.f0 * 4 * Math.PI / 3)
    this.x = x
    this.y = y
  }

  get id() {
    return this.id0 + 1
  }

  get fiberId(): number {
    // @ts-ignore
    return cobId2fiberId[this.id]
  }

  get moduleId() {
    return this.m0 + 1
  }

  get fieldId() {
    return this.f0 + 1
  }
}

function rotation(x: number, y: number, rot: number) {
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  return [
    c * x - s * y,
    s * x + c * y,
  ]
}


function buildCobraPositionIndex() {
  const cobras = range(NUM_OF_COBRAS).map(id0 => new Cobra(id0))
  return new KdTree<2, Cobra>(cobras, ({ x, y }) => [x, y])
}


function convertTouchEventToMouseEvent(e: TouchEvent) {
  const { clientX, clientY } = e.touches[0]
  return { clientX, clientY }
}
