import "./base.scss"
import "./layout.scss"
import "./input/default"
import "./input/dark"
import "./input/scrollbar.scss"
import "./splitpanes.scss"

if (import.meta.env.DEV) {
  import("./devel.scss")
}
