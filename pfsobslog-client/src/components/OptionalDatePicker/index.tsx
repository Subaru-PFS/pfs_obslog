import { defineComponent, PropType, reactive, watch, watchEffect } from "vue";
import style from './style.module.scss'

export default defineComponent({
  props: {
    label: { type: String },
    onChange: { type: Function as PropType<(value?: string) => void> },
    value: { type: String },
  },
  setup(props, { slots }) {
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
          <input type="checkbox" checked={$.enabled} onChange={(e: any) => $.enabled = e.target.checked} />
          <span>{(props.label && props.label) ?? slots.default?.()}</span>
        </label>
        <input type="date" v-model={$.date} disabled={!$.enabled} />
      </div >
    )
  }
})
