import Color from "color"
import { usePreferredDark } from "@vueuse/core"
import { CSSProperties } from "vue"


const isDark = usePreferredDark()


export function bgColor(color: Color) {
  return isDark.value ?
    color.desaturate(0.5).darken(0.5) :
    color.desaturate(0).lighten(0.75)
}

export function fgColor(color: Color) {
  return isDark.value ?
    color.desaturate(0.25).lighten(0.75) :
    color.desaturate(0.25).darken(0.5)
}

export function int2color(n: number) {
  return Color.hsv(n * 150, 100, 100)
}

export function domStyle(c: Color): CSSProperties {
  return {
    backgroundColor: bgColor(c).string(),
    color: fgColor(c).string(),
  }
}
