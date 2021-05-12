import Color from "color"
import { usePreferredDark } from "@vueuse/core"


const isDark = usePreferredDark()


export function bgColor(color: Color) {
  return isDark.value ?
    color.desaturate(0.75).darken(0.75) :
    color.desaturate(0.5).lighten(0.75)
}

export function fgColor(color: Color) {
  return isDark.value ?
    color.desaturate(0.75).lighten(0.5) :
    color.desaturate(0.75).darken(0.25)
}
