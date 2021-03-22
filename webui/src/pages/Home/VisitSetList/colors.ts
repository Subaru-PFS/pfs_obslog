import Color from 'color'
import { JSX } from 'solid-js'


export function sequenceTypeStyle(sequenceType: string | undefined) {
  const baseColor = sequenceTypeBaseColorTable[sequenceType!] || Color('#777')
  return style(baseColor)
}

export function statusStyle(status: string | undefined) {
  const baseColor = statusBaseColorTable[status!] || Color('#f00')
  return style(baseColor)
}

export function numberOfExposuresStyle(sps: number, mcs: number, agc: number) {
  const baseColor = sps === 0 && mcs === 0 && agc === 0 ?
    Color('#777') :
    int2color(
      (Number(sps > 0) << 2) |
      (Number(mcs > 0) << 1) |
      (Number(agc > 0) << 0)
    )
  return style(baseColor)
}

function bgColor(color: Color) {
  return color.desaturate(0).lighten(0.75)
}

function fgColor(color: Color) {
  return color.desaturate(0.25).darken(0.5)
}

function int2color(n: number) {
  return Color.hsv(n * 150, 100, 100)
}

function style(c: Color): JSX.CSSProperties {
  return {
    color: fgColor(c).string(),
    "background-color": bgColor(c).string(),
    // "border-color": bgColor(c).string(),
  }
}

const sequenceTypeBaseColorTable: { [sequenceType: string]: Color } = {
  scienceObject: Color('#07f'),
  scienceTrace: Color('#00f'),
  scienceArc: Color('#0f0'),
  ditheredArcs: Color('#0f0'),
}

const statusBaseColorTable: { [name: string]: Color } = {
  finishRequested: Color('#00f'),
  complete: Color('#0f0'),
}
