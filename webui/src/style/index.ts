import "./base.scss"
import "./layout.scss"
import "./date-polyfill.scss"
import "./themes/default"
import "./themes/dark"

if (import.meta.env.DEV) {
  import("./devel.scss")
}
