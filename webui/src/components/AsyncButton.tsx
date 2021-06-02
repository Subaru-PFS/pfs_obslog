import { CSSProperties, defineComponent, PropType, reactive } from "vue"

export default defineComponent({
  name: import.meta.url,
  setup($$, { slots }) {
    const $ = reactive({
      ajax: false,
    })

    const onClick = async (e: MouseEvent) => {
      $.ajax = true
      try {
        return await $$.onClick(e)
      }
      finally {
        $.ajax = false
      }
    }

    return () =>
      <button style={{}} onClick={onClick} disabled={$.ajax || $$.disabled}>
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
