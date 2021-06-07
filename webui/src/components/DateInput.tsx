import { defineComponent, PropType, reactive, watchEffect } from "vue"
import MI from "~/components/MI"

export const DateInput = defineComponent({
  setup($p, { emit }) {
    const $ = reactive({
      value: $p.modelValue,
    })

    watchEffect(() => {
      if ($.value === undefined || $.value && $.value.match(/\d{4}\-\d{2}\-\d{2}$/) && validDate($.value)) {
        emit('update:modelValue', $.value)
      }
      else {
        $.value = $p.modelValue
      }
    })

    const render = () => (
      <div style={{ display: 'flex' }}>
        {/* <pre>{$.value}</pre> */}
        <button onClick={() => $.value = undefined} disabled={$p.disabled}>
          <MI icon='cancel' size={18}  />
        </button>
        <input type="date" v-model={[$.value, ['lazy']]} disabled={$p.disabled} />
      </div>
    )
    return render
  },
  props: {
    modelValue: {
      type: String as PropType<string>,
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
