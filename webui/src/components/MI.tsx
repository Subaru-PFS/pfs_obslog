import { defineComponent, PropType } from "vue"
import { capitalize } from "~/utils/string"
import { $reactive } from "~/vue-utils/reactive"

export default defineComponent({
  setup($p) {
    const $ = $reactive({
      get title() {
        return $p.title || capitalize($p.icon)
      }
    })

    const render = () =>
      <i title={$.title} style={{ verticalAlign: 'bottom', fontSize: `${$p.size}px` }} class={$p.type} >{$p.icon}</i>
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
    },
    type: {
      type: String as PropType<
        'material-icons' |
        'material-icons-outlined' |
        'material-icons-round' |
        'material-icons-two-tone'
      >,
      default: 'material-icons-outlined'
    },
  },
})

