import { defineComponent } from "@vue/runtime-core"
import { capitalize } from "~/utils/string"
import { $reactive } from "~/vue-utils/reactive"

export default defineComponent({
  setup($$) {
    const $ = $reactive({
      get title() {
        return $$.title || capitalize($$.icon)
      }
    })

    const render = () =>
      <i title={$.title} style={{ verticalAlign: 'bottom', fontSize: `${$$.size}px` }} class="material-icons" >{$$.icon}</i>
    return render
  },
  props: {
    icon: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      default: 24,
    },
    title: {
      type: String,
    }
  },
})

