import "./base.scss"
import "./layout.scss"

if (import.meta.env.DEV) {
  import("./devel.scss")
}
