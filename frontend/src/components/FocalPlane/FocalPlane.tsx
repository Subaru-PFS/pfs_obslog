/**
 * FocalPlane - PFS焦点面のファイバー配置可視化コンポーネント
 */
import { useRef, useEffect, useCallback, useMemo } from 'react'
import { Cobra, getAllCobras, NUM_OF_COBRAS } from './Cobra'
import styles from './FocalPlane.module.scss'

export type { Cobra }

interface FocalPlaneProps {
  /** 表示サイズ（px） */
  size?: number
  /** 各Cobraの色を決定する関数 */
  colorFunc: (cobra: Cobra) => string
  /** マウスがCobraに入った時のコールバック */
  onPointerEnter?: (cobra: Cobra | undefined) => void
  /** 外部からフォーカスするCobra（SkyViewerからの連携用） */
  externalFocusCobra?: Cobra
  /** 再描画トリガー用の依存配列 */
  refreshDeps?: unknown[]
}

/**
 * KD木の簡易実装（2D用）
 */
class SimpleKdTree {
  private cobras: Cobra[]

  constructor(cobras: Cobra[]) {
    this.cobras = cobras
  }

  nearest(point: [number, number], maxDistance: number): Cobra | undefined {
    const [px, py] = point
    let nearestCobra: Cobra | undefined
    let nearestDist = maxDistance * maxDistance

    // 簡易的に全探索（Cobraは2394個なので十分高速）
    for (const cobra of this.cobras) {
      const dx = cobra.x - px
      const dy = cobra.y - py
      const dist = dx * dx + dy * dy
      if (dist < nearestDist) {
        nearestDist = dist
        nearestCobra = cobra
      }
    }

    return nearestCobra
  }
}

/**
 * Cobraの位置インデックスを構築
 */
function buildCobraPositionIndex(): SimpleKdTree {
  const cobras = getAllCobras()
  return new SimpleKdTree(cobras)
}

// 六角形の頂点を生成
function regularPolygonCoords(
  n: number,
  radius: number,
  phase = 0
): [number, number][] {
  return Array.from({ length: n }, (_, i): [number, number] => [
    radius * Math.cos(((i + phase) / n) * 2 * Math.PI),
    radius * Math.sin(((i + phase) / n) * 2 * Math.PI),
  ])
}

// 六角形を描画
function drawHexagon(
  ctx: CanvasRenderingContext2D,
  radius: number,
  phase = 0,
  stroke = false
) {
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

// ビューポート設定
function setFocalPlaneViewport(
  ctx: CanvasRenderingContext2D,
  cb: () => void
): DOMMatrix {
  const { width, height } = ctx.canvas
  ctx.save()
  ctx.translate(width / 2, height / 2)
  ctx.scale(height, height)
  ctx.scale(1 / (58 * 2), 1 / (58 * 2))
  const matrix = ctx.getTransform()
  cb()
  ctx.restore()
  return matrix
}

// 焦点面のベース描画
function drawFocalPlaneBase(
  ctx: CanvasRenderingContext2D,
  colorFunc: (cobra: Cobra) => string
): DOMMatrix {
  const { width, height } = ctx.canvas
  ctx.clearRect(0, 0, width, height)
  let viewport: DOMMatrix = new DOMMatrix([1, 0, 0, 1, 0, 0])

  viewport = setFocalPlaneViewport(ctx, () => {
    // 背景の六角形
    ctx.fillStyle = '#777'
    drawHexagon(ctx, 58, 0.5)

    // 各Cobraを描画
    for (let id0 = 0; id0 < NUM_OF_COBRAS; ++id0) {
      const cobra = new Cobra(id0)
      ctx.fillStyle = colorFunc(cobra)
      ctx.save()
      ctx.translate(cobra.x, cobra.y)
      drawHexagon(ctx, 1)
      ctx.restore()
    }
  })

  return viewport
}

// フォーカス表示の描画
function drawFocalPlaneFocus(
  ctx: CanvasRenderingContext2D,
  cobra: Cobra | undefined
) {
  const { width, height } = ctx.canvas
  ctx.clearRect(0, 0, width, height)

  if (cobra) {
    setFocalPlaneViewport(ctx, () => {
      ctx.fillStyle = 'transparent'
      ctx.lineWidth = 1
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)'
      ctx.save()
      ctx.translate(cobra.x, cobra.y)
      drawHexagon(ctx, 1.5, 0, true)
      ctx.restore()
    })
  }
}

export function FocalPlane({
  size = 250,
  colorFunc,
  onPointerEnter,
  externalFocusCobra,
  refreshDeps = [],
}: FocalPlaneProps) {
  const baseCanvasRef = useRef<HTMLCanvasElement>(null)
  const focusCanvasRef = useRef<HTMLCanvasElement>(null)
  const viewportRef = useRef<DOMMatrix>(new DOMMatrix([1, 0, 0, 1, 0, 0]))
  const lastFocalCobraRef = useRef<Cobra | undefined>(undefined)
  const indexRef = useRef<SimpleKdTree | null>(null)

  // Cobraインデックスの初期化
  useEffect(() => {
    indexRef.current = buildCobraPositionIndex()
  }, [])

  // キャンバスサイズ
  const canvasSize = useMemo(() => {
    const dpr = window.devicePixelRatio || 1
    const w = 2 * Math.ceil(0.5 * dpr * size * (Math.sqrt(3) / 2))
    const h = 2 * Math.ceil(0.5 * dpr * size)
    return { w, h }
  }, [size])

  const cssSize = useMemo(
    () => ({
      width: `${Math.floor(canvasSize.w / (window.devicePixelRatio || 1))}px`,
      height: `${Math.floor(canvasSize.h / (window.devicePixelRatio || 1))}px`,
    }),
    [canvasSize]
  )

  // ベースキャンバスの描画
  useEffect(() => {
    const ctx = baseCanvasRef.current?.getContext('2d')
    if (ctx) {
      viewportRef.current = drawFocalPlaneBase(ctx, colorFunc)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorFunc, canvasSize, ...refreshDeps])

  // クライアント座標からFocal座標への変換
  const clientCoord2FocalCoord = useCallback(
    (e: { clientX: number; clientY: number }): [number, number] => {
      const canvas = baseCanvasRef.current
      if (!canvas) return [0, 0]

      const { clientX, clientY } = e
      const { left: ox, top: oy } = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const x = (clientX - ox) * dpr
      const y = (clientY - oy) * dpr
      const p = viewportRef.current.inverse().transformPoint(new DOMPoint(x, y))
      return [p.x, p.y]
    },
    []
  )

  // フォーカス表示
  const showFocusedCobra = useCallback((cobra: Cobra | undefined) => {
    if (cobra !== lastFocalCobraRef.current) {
      const ctx = focusCanvasRef.current?.getContext('2d')
      if (ctx) {
        drawFocalPlaneFocus(ctx, cobra)
      }
      lastFocalCobraRef.current = cobra
    }
  }, [])

  // 外部からのフォーカス（SkyViewerからの連携）
  useEffect(() => {
    if (externalFocusCobra) {
      showFocusedCobra(externalFocusCobra)
    }
  }, [externalFocusCobra, showFocusedCobra])

  // マウス移動ハンドラ
  const handleMouseMove = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const [x, y] = clientCoord2FocalCoord(e)
      const nearest = indexRef.current?.nearest([x, y], 2)
      onPointerEnter?.(nearest)
      showFocusedCobra(nearest)
    },
    [clientCoord2FocalCoord, onPointerEnter, showFocusedCobra]
  )

  // タッチ移動ハンドラ
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const { clientX, clientY } = e.touches[0]
      handleMouseMove({ clientX, clientY })
    },
    [handleMouseMove]
  )

  // マウス離脱ハンドラ
  const handleMouseLeave = useCallback(() => {
    showFocusedCobra(undefined)
    onPointerEnter?.(undefined)
  }, [onPointerEnter, showFocusedCobra])

  return (
    <div
      className={styles.focalPlaneContainer}
      style={cssSize}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onMouseLeave={handleMouseLeave}
    >
      <canvas
        ref={baseCanvasRef}
        className={styles.baseCanvas}
        style={cssSize}
        width={canvasSize.w}
        height={canvasSize.h}
      />
      <canvas
        ref={focusCanvasRef}
        className={styles.focusCanvas}
        style={cssSize}
        width={canvasSize.w}
        height={canvasSize.h}
      />
    </div>
  )
}
