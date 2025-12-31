/**
 * Clock コンポーネント - アナログ時計UI
 */
import { useRef, useEffect, useCallback, useState } from 'react'
import styles from './SkyViewer.module.scss'

interface ClockProps {
  size?: number
  hour?: number
  minute?: number
  second?: number
  onScrew?: (angle: number) => void
}

interface ClockStyle {
  dialBackground: string
  numberStyle: string
  timeStringStyle: string
  hour: {
    strokeStyle: string
    length: number
    width: number
    show: boolean
  }
  minute: {
    strokeStyle: string
    length: number
    width: number
    show: boolean
  }
  second: {
    strokeStyle: string
    length: number
    width: number
    show: boolean
  }
}

function defaultClockStyle(): ClockStyle {
  return {
    dialBackground: 'rgba(0, 0, 0, 0.9)',
    numberStyle: 'rgba(255, 255, 255, 1)',
    timeStringStyle: 'rgba(255, 255, 255, 1)',
    hour: {
      strokeStyle: 'rgba(255, 255, 255, 0.5)',
      length: 0.5,
      width: 0.07,
      show: true,
    },
    minute: {
      strokeStyle: 'rgba(255, 255, 255, 0.25)',
      length: 0.8,
      width: 0.05,
      show: true,
    },
    second: {
      strokeStyle: 'red',
      length: 0.9,
      width: 0.02,
      show: false,
    },
  }
}

function drawClock(
  ctx: CanvasRenderingContext2D,
  options: { hour?: number; minute?: number; second?: number; style?: ClockStyle }
) {
  const { width, height } = ctx.canvas
  const r0 = height / 2
  const style = options.style ?? defaultClockStyle()

  ctx.clearRect(0, 0, width, height)
  ctx.save()
  ctx.translate(r0, r0)

  // 文字盤
  ctx.beginPath()
  ctx.arc(0, 0, r0, 0, 2 * Math.PI)
  ctx.fillStyle = style.dialBackground
  ctx.fill()

  // 時刻文字列
  ctx.font = r0 * 0.3 + 'px sans-serif'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.fillStyle = style.timeStringStyle
  const h = options.hour ?? 0
  const m = options.minute ?? 0
  ctx.fillText(`0${h}`.slice(-2) + ':' + `0${m}`.slice(-2), 0, 0.4 * r0)

  // 数字
  const r = 0.9 * r0
  ctx.font = r0 * 0.15 + 'px sans-serif'
  ctx.fillStyle = style.numberStyle
  for (let n = 1; n < 13; n++) {
    const t = (n * Math.PI) / 6 - Math.PI / 2
    ctx.fillText(String(n), r * Math.cos(t), r * Math.sin(t))
  }

  // 針を描画
  const drawHand = (
    ratio: number,
    handStyle: { strokeStyle: string; length: number; width: number; show: boolean }
  ) => {
    if (handStyle.show) {
      const t = 2 * Math.PI * ratio - Math.PI / 2
      const handR = r0 * handStyle.length
      ctx.beginPath()
      ctx.strokeStyle = handStyle.strokeStyle
      ctx.lineWidth = r0 * handStyle.width
      ctx.lineCap = 'round'
      ctx.moveTo(0, 0)
      ctx.lineTo(handR * Math.cos(t), handR * Math.sin(t))
      ctx.stroke()
    }
  }

  if (options.hour !== undefined) {
    drawHand(
      (options.hour + ((options.minute ?? 0) + (options.second ?? 0) / 60) / 60) / 12,
      style.hour
    )
  }
  if (options.minute !== undefined) {
    drawHand((options.minute + (options.second ?? 0) / 60) / 60, style.minute)
  }
  if (options.second !== undefined) {
    drawHand(options.second / 60, style.second)
  }

  ctx.restore()
}

export function Clock({ size = 120, hour, minute, second, onScrew }: ClockProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cursor, setCursor] = useState('grab')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawClock(ctx, { hour, minute, second })
  }, [hour, minute, second])

  const clockCenter = useCallback((): [number, number] => {
    const canvas = canvasRef.current
    if (!canvas) return [0, 0]
    const { left, top, width, height } = canvas.getBoundingClientRect()
    return [left + width / 2, top + height / 2]
  }, [])

  const handleDrag = useCallback(
    (startEvent: React.MouseEvent | React.TouchEvent) => {
      const getPos = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
        if ('touches' in e) {
          return { x: e.touches[0].clientX, y: e.touches[0].clientY }
        }
        return { x: e.clientX, y: e.clientY }
      }

      const startPos =
        'touches' in startEvent.nativeEvent
          ? getPos(startEvent.nativeEvent)
          : { x: startEvent.nativeEvent.clientX, y: startEvent.nativeEvent.clientY }

      let lastX = startPos.x
      let lastY = startPos.y
      const [ox, oy] = clockCenter()

      setCursor('grabbing')

      const handleMove = (e: MouseEvent | TouchEvent) => {
        const pos = getPos(e)
        const x1 = lastX - ox
        const y1 = lastY - oy
        const x2 = pos.x - ox
        const y2 = pos.y - oy
        const det = x1 * y2 - x2 * y1
        const sine = det / Math.sqrt((x1 ** 2 + y1 ** 2) * (x2 ** 2 + y2 ** 2))
        onScrew?.(sine)
        lastX = pos.x
        lastY = pos.y
      }

      const handleEnd = () => {
        setCursor('grab')
        document.removeEventListener('mousemove', handleMove)
        document.removeEventListener('mouseup', handleEnd)
        document.removeEventListener('touchmove', handleMove)
        document.removeEventListener('touchend', handleEnd)
        document.removeEventListener('touchcancel', handleEnd)
      }

      document.addEventListener('mousemove', handleMove)
      document.addEventListener('mouseup', handleEnd)
      document.addEventListener('touchmove', handleMove)
      document.addEventListener('touchend', handleEnd)
      document.addEventListener('touchcancel', handleEnd)
    },
    [clockCenter, onScrew]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          onScrew?.((2 * Math.PI) / (12 * 60))
          break
        case 'ArrowDown':
          onScrew?.((-2 * Math.PI) / (12 * 60))
          break
      }
    },
    [onScrew]
  )

  const dpr = window.devicePixelRatio || 1

  return (
    <canvas
      ref={canvasRef}
      tabIndex={0}
      className={styles.clock}
      style={{ width: `${size}px`, height: `${size}px`, cursor }}
      width={size * dpr}
      height={size * dpr}
      onMouseDown={handleDrag}
      onTouchStart={handleDrag}
      onKeyDown={handleKeyDown}
    />
  )
}
