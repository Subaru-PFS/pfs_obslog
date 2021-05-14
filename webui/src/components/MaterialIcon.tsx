import { defineComponent } from "@vue/runtime-core"

export default defineComponent({
  setup($$) {
    const render = () =>
      <i style={{ verticalAlign: 'bottom', fontSize: `${$$.size}px` }} class="material-icons" >{$$.icon}</i>
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
    }
  },
})
