export const markers = {
  circle,
  cross1,
  cross2,
  cross3,
  dot,
  polygon,
}


function circle(markerSize = 32, lineWidth = 0.2): ImageData {
  const { canvas, ctx } = getCanvas()
  canvas.width = markerSize
  canvas.height = markerSize
  ctx.clearRect(0, 0, markerSize, markerSize)
  ctx.setTransform(markerSize / 2, 0, 0, markerSize / 2, markerSize / 2, markerSize / 2)
  ctx.strokeStyle = '#ffffff'
  ctx.beginPath()
  ctx.globalAlpha = 1
  ctx.lineWidth = lineWidth
  ctx.arc(0, 0, 1 - lineWidth, 0, 2 * Math.PI, false)
  ctx.stroke()
  return ctx.getImageData(0, 0, markerSize, markerSize)
}


function cross1(markerSize = 32): ImageData {
  const { canvas, ctx } = getCanvas()
  canvas.width = markerSize
  canvas.height = markerSize
  ctx.clearRect(0, 0, markerSize, markerSize)
  ctx.setTransform(markerSize / 2, 0, 0, markerSize / 2, markerSize / 2, markerSize / 2)
  ctx.strokeStyle = '#ffffff'
  ctx.beginPath()
  ctx.globalAlpha = 1
  ctx.lineWidth = 0.2
  ctx.moveTo(-1, 0)
  ctx.lineTo(+1, 0)
  ctx.moveTo(0, -1)
  ctx.lineTo(0, 1)
  ctx.stroke()
  return ctx.getImageData(0, 0, markerSize, markerSize)
}


function cross2(markerSize = 32): ImageData {
  const { canvas, ctx } = getCanvas()
  canvas.width = markerSize
  canvas.height = markerSize
  ctx.clearRect(0, 0, markerSize, markerSize)
  ctx.setTransform(markerSize / 2, 0, 0, markerSize / 2, markerSize / 2, markerSize / 2)
  ctx.strokeStyle = '#ffffff'
  ctx.beginPath()
  ctx.globalAlpha = 1
  ctx.lineWidth = 0.2
  const L = Math.SQRT1_2
  ctx.moveTo(-L, -L)
  ctx.lineTo(+L, +L)
  ctx.moveTo(+L, -L)
  ctx.lineTo(-L, +L)
  ctx.stroke()
  return ctx.getImageData(0, 0, markerSize, markerSize)
}


function cross3(markerSize = 32): ImageData {
  const { canvas, ctx } = getCanvas()
  canvas.width = markerSize
  canvas.height = markerSize
  ctx.clearRect(0, 0, markerSize, markerSize)
  ctx.setTransform(markerSize / 2, 0, 0, markerSize / 2, markerSize / 2, markerSize / 2)
  ctx.strokeStyle = '#ffffff'
  ctx.beginPath()
  ctx.globalAlpha = 1
  ctx.lineWidth = 0.2
  ctx.moveTo(-1, 0)
  ctx.lineTo(+1, 0)
  ctx.moveTo(0, -1)
  ctx.lineTo(0, 1)
  ctx.stroke()
  ctx.clearRect(-0.5, -0.5, 1, 1)
  return ctx.getImageData(0, 0, markerSize, markerSize)
}


function dot(markerSize = 32): ImageData {
  const { canvas, ctx } = getCanvas()
  canvas.width = markerSize
  canvas.height = markerSize
  ctx.clearRect(0, 0, markerSize, markerSize)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(markerSize / 2 - 1, markerSize / 2 - 1, 2, 2)
  return ctx.getImageData(0, 0, markerSize, markerSize)
}


function polygon(markerSize = 32, nEdges = 3): ImageData {
  const { canvas, ctx } = getCanvas()
  canvas.width = markerSize
  canvas.height = markerSize
  ctx.clearRect(0, 0, markerSize, markerSize)
  ctx.setTransform(markerSize / 2, 0, 0, markerSize / 2, markerSize / 2, markerSize / 2)
  ctx.strokeStyle = '#ffffff'
  ctx.beginPath()
  ctx.globalAlpha = 1
  ctx.lineWidth = 0.2
  ctx.moveTo(0, -1)
  for (let i = 1; i <= nEdges; ++i) {
    ctx.lineTo(Math.sin(2 * Math.PI * i / nEdges), -Math.cos(2 * Math.PI * i / nEdges))
  }
  ctx.stroke()
  return ctx.getImageData(0, 0, markerSize, markerSize)
}


const getCanvas = (() => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  return () => ({ canvas, ctx })
})()
