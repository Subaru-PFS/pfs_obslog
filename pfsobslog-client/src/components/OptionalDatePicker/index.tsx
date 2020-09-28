import { defineComponent, PropType, reactive, watch, watchEffect } from "vue"
import style from './style.module.scss'
import { vModel, vModelCheckbox } from "/src/utils/vModel"

export default defineComponent({
  props: {
    label: { type: String },
    onChange: { type: Function as PropType<(value?: string) => void> },
    value: { type: String },
  },
  setup(props, { slots, emit }) {
    const $ = reactive({
      date: undefined as undefined | string,
      enabled: props.value !== undefined,
    })
    watch(() => [$.date, $.enabled], () => {
      props.onChange?.($.enabled ? $.date : undefined)
    })
    watchEffect(() => {
      if (props.value !== undefined) {
        $.date = props.value
      }
    })
    return () => (
      <div class={style.root}>
        <label>
          <input type="checkbox" {...vModelCheckbox($.enabled, _ => $.enabled = _)} />
          <span>{(props.label && props.label) ?? slots.default?.()}</span>
        </label>
        <input type="date" {...vModel($.date, _ => $.date = _)} disabled={!$.enabled}
        />
      </div >
    )
  }
})
