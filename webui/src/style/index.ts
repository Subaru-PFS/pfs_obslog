import "./base.scss"
import "./layout.scss"
import "./date-polyfill.scss"
import { usePreferredDark } from "@vueuse/core";



(() => {
  const isDark = usePreferredDark()
  if (isDark.value) {
    import("./themes/dark")
  } else {
    import("./themes/light")
  }
})()

if (import.meta.env.DEV) {
  import("./devel.scss")
}
