import { CSSProperties, defineComponent, PropType, reactive } from "vue"

export default defineComponent({
  name: import.meta.url,
  setup($p, { slots }) {
    const $ = reactive({
      ajax: false,
    })

    const onClick = async (e: MouseEvent) => {
      $.ajax = true
      try {
        return await $p.onClick(e)
      }
      finally {
        $.ajax = false
      }
    }

    return () =>
      <button style={{}} onClick={onClick} disabled={$.ajax || $p.disabled}>
        {slots.default?.()}
      </button>
  },
  props: {
    onClick: {
      type: Function as PropType<(e: Event) => any>,
      required: true,
    },
    style: {
      type: Object as PropType<CSSProperties>,
      default: {},
    },
    disabled: {
      type: Boolean,
      default: false,
    }
  }
})
