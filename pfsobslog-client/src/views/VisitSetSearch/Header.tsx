import { defineComponent, inject, onMounted, PropType, reactive, ref, watchEffect } from "vue"
import { $control, SearchCondition } from "./index"
import style from './style.module.scss'
import OptionalDatePicker from '/src/components/OptionalDatePicker'
import { go } from "/src/router"
import { logout } from "/src/session"

export const Header = defineComponent({
  props: {
    value: {
      type: Object as PropType<SearchCondition>, required: true
    },
    onChange: {
      type: Function as PropType<(value: SearchCondition) => void>,
    }
  },
  setup($p) {
    const $ = reactive<SearchCondition>($p.value)

    onMounted(() => queryInput.value?.focus())
    const queryInput = ref<HTMLInputElement>()

    const { refresh } = inject($control)!

    watchEffect(() => {
      $p.onChange?.($)
    })

    const onSqlChange = debounce((e: Event) => {
      // @ts-ignore
      $.sql = e.target.value
    }, 500)

    return () => (
      <div class={style.header}>
        <OptionalDatePicker
          label="Start"
          value={$.start}
          onChange={date => $.start = date} />
        <OptionalDatePicker
          label="End"
          value={$.end}
          onChange={date => $.end = date} />
        <label>
          <input type="checkbox" checked={$.includeSps} onChange={(e: any) => $.includeSps = e.target.checked} />
          SpS
        </label>
        <label>
          <input type="checkbox" checked={$.includeMcs} onChange={(e: any) => $.includeMcs = e.target.checked} />
          MCS
        </label>
        <div class="padding" style={{ display: 'flex', alignItems: 'flex-end' }}>
          <input
            type="text"
            value={$.sql}
            onInput={onSqlChange}
            onChange={(e: any) => $.sql = e.target.value}
            ref={queryInput}
            style={{ flexGrow: 1 }}
            placeholder="Full-text Search"
          />
        </div>
        <button onClick={() => $.page = 0} disabled={$.page <= 0}>⏪</button>
        <button onClick={() => --$.page} disabled={$.page <= 0}>◀️</button>
        <input type="text" readonly v-model={$.page} size={2} style={{ textAlign: 'center' }} />
        <button onClick={() => ++$.page}>▶️</button>
        &nbsp;
        <button onClick={refresh}>🔄</button>
        <button onClick={() => { logout(); go('/login') }}>👋</button>
      </div>
    )
  }
})


function debounce<T>(f: (e: T) => void, delay: number) {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (e: T) => {
    if (timer !== null) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      timer = null
      f(e)
    }, delay)
  }
}