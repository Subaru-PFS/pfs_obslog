import { defineComponent, PropType, reactive, watchEffect } from "@vue/runtime-core"
import { MI } from "~/components/MaterialIcon"

export const DateInput = defineComponent({
  setup($$, { emit }) {
    const $ = reactive({
      value: $$.modelValue || null,
    })

    watchEffect(() => {
      if ($.value && $.value.match(/\d{4}\-\d{2}\-\d{2}$/) && validDate($.value)) {
        emit('update:modelValue', $.value)
      }
    })

    const render = () => (
      <div style={{ display: 'flex' }}>
        {/* <pre>{$.value}</pre> */}
        <button onClick={() => $.value = null} disabled={$$.disabled}>
          {MI('cancel', 18)}
        </button>
        <input type="date" v-model={$.value} disabled={$$.disabled} />
      </div>
    )
    return render
  },
  props: {
    modelValue: {
      type: String as PropType<string | null>,
    },
    disabled: {
      type: Boolean,
      default: false,
    }
  }
})


function validDate(s: string) {
  try {
    new Date(s)
    return true
  } catch {
    return false
  }
}
