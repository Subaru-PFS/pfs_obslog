import "./base.scss"
import "./layout.scss"
import "./input/default"
import "./input/dark"

if (import.meta.env.DEV) {
  import("./devel.scss")
}
