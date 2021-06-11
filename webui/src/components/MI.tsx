import { defineComponent, PropType } from "vue"

export default defineComponent({
  setup($p) {
    const render = () =>
      <i style={{ verticalAlign: 'bottom', fontSize: `${$p.size}px` }} class={$p.type} >{$p.icon}</i>
    return render
  },
  props: {
    icon: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      default: 20,
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

