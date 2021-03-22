type HandStyle = {
  strokeStyle: string
  width: number
  length: number
  show: boolean
}

function defaultClockStyle() {
  return {
    dialBackground: 'rgba(0, 0, 0, 0.9)',
    numberStyle: 'rgba(255, 255, 255, 1)',
    timeStringStyle: 'rgba(255, 255, 255, 1)',
    hour: {
      strokeStyle: 'rgba(255, 255, 255, 0.5)',
      length: 0.5,
      width: 0.07,
      show: true,
    } as HandStyle,
    minute: {
      strokeStyle: 'rgba(255, 255, 255, 0.25)',
      length: 0.8,
      width: 0.05,
      show: true,
    } as HandStyle,
    second: {
      strokeStyle: 'red',
      length: 0.9,
      width: 0.02,
      show: false,
    } as HandStyle,
  }
}

export type ClockStyle = ReturnType<typeof defaultClockStyle>

type DrawClockOptions = {
  hour?: number
  minute?: number
  second?: number
  style?: ClockStyle
}

export function drawClock(ctx: CanvasRenderingContext2D, options: DrawClockOptions = {}) {
  const { width, height } = ctx.canvas
  const r0 = height / 2
  const style = options.style ?? defaultClockStyle()

  const main = () => {
    ctx.clearRect(0, 0, width, height)
    pushContext(ctx, () => {
      ctx.translate(r0, r0)
      drawDial()
      drawTimeString()
      drawNumbers()
      if (options.hour !== undefined) {
        drawHand(
          (options.hour +
            ((options.minute ?? 0) +
              (options.second ?? 0) / 60) / 60) / 12,
          style.hour
        )
      }
      if (options.minute !== undefined) {
        drawHand(
          (options.minute + (options.second ?? 0) / 60) / 60,
          style.minute)
      }
      if (options.second !== undefined) {
        drawHand(options.second / 60, style.second)
      }
    })
  }

  const drawHand = (ratio: number, style: HandStyle) => {
    if (style.show) {
      const t = 2 * Math.PI * ratio - Math.PI / 2
      const r = r0 * style.length
      ctx.beginPath()
      ctx.strokeStyle = style.strokeStyle
      ctx.lineWidth = r0 * style.width
      ctx.lineCap = "round"
      ctx.moveTo(0, 0)
      ctx.lineTo(r * Math.cos(t), r * Math.sin(t))
      ctx.stroke()
    }
  }

  const drawDial = () => {
    ctx.beginPath()
    ctx.arc(0, 0, r0, 0, 2 * Math.PI)
    ctx.fillStyle = style.dialBackground
    ctx.fill()
  }

  const drawTimeString = () => {
    ctx.font = r0 * 0.3 + "px sans-serif"
    ctx.textBaseline = "middle"
    ctx.textAlign = "center"
    ctx.fillStyle = style.timeStringStyle
    const h = options.hour ?? 0
    const m = options.minute ?? 0
    ctx.fillText(`0${h}`.slice(-2) + ':' + `0${m}`.slice(-2), 0, 0.4 * r0)
  }

  const drawNumbers = () => {
    const r = 0.9 * r0
    ctx.font = r0 * 0.15 + "px sans-serif"
    ctx.textBaseline = "middle"
    ctx.textAlign = "center"
    ctx.fillStyle = style.numberStyle
    for (let n = 1; n < 13; n++) {
      const t = n * Math.PI / 6 - Math.PI / 2
      ctx.fillText(String(n), r * Math.cos(t), r * Math.sin(t))
    }
  }

  main()
}


function pushContext(ctx: CanvasRenderingContext2D, cb: () => void) {
  ctx.save()
  try {
    cb()
  }
  finally {
    ctx.restore()
  }
}
